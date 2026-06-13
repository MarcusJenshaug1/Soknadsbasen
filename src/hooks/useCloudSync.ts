"use client";

/**
 * Cloud sync hook — keeps Zustand stores in sync with the server
 * when the user is logged in.
 *
 * Strategi:
 *  - Init: hent /api/user/data, hydrer store
 *  - Auto-save: debounced 500ms etter hver lokal endring
 *  - Live collab: Supabase Realtime Broadcast på channel cv:<userId>.
 *    Etter en vellykket save kringkaster vi `cv-updated`. Andre klienter
 *    på samme userId fanger event-en og refetcher umiddelbart. Sub-100ms.
 *  - Fallback: slow poll (30s) hvis broadcast-channel skulle dø.
 *  - beforeunload: sendBeacon for last-chance save.
 *
 * Status (saving/saved/error) lever i useCloudSyncStore for å ikke trigge
 * subscribe-loop tilbake til selve CV-stateen.
 */

import { useEffect, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useResumeStore } from "@/store/useResumeStore";
import { useCloudSyncStore } from "@/store/useCloudSyncStore";
import type { ResumeData, ResumeEntry } from "@/store/useResumeStore";

/* ─── Types ───────────────────────────────────────────────── */

interface ResumePayloadV2 {
  resumes: ResumeEntry[];
  activeResumeId: string;
  _resumeDataMap: Record<string, ResumeData>;
  data: ResumeData;
}

interface ResumePayloadV1 {
  data: ResumeData;
}

interface ServerData {
  resumeData: ResumePayloadV2 | ResumePayloadV1 | null;
  debug?: { sessionEmail?: string };
}

/** Payload som hver klient kringkaster i presence-state på cv-kanalen. */
type PresenceMeta = {
  clientId: string;
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  step: number;
  focusLabel: string | null;
  focusFieldId: string | null;
  impersonating: boolean;
  joinedAt: number;
};

/* ─── Constants ───────────────────────────────────────────── */

// Save og broadcast er frikoblet. Broadcast fyrer raskt for collab-feel,
// save går saktere for å spare DB-skriving.
const BROADCAST_DEBOUNCE_MS = 50;
const SAVE_DEBOUNCE_MS = 500;
// Polling er fallback hvis Realtime-channel skulle dø. Når broadcast ikke
// lenger venter på save kan vi heve intervallet — vi får sub-200ms via
// broadcast i hovedflyten.
const POLL_INTERVAL_MS = 15_000;
// Klient-id sendt med broadcast så vi kan ignorere våre egne ekko.
const CLIENT_ID = `cli-${Math.random().toString(36).slice(2, 10)}`;

// Broadcast og presence er best-effort: feiler de (nettverksblipp, død
// kanal) skal ikke UI-en krasje. Men feilen skal heller ikke forsvinne i
// stillhet — vi warner én gang per kontekst (cursor-broadcast kan feile
// ~33x/s når kanalen er nede, så uten dedup ville konsollen flommet over).
const loggedSyncContexts = new Set<string>();
function logSyncError(context: string, err: unknown) {
  if (loggedSyncContexts.has(context)) return;
  loggedSyncContexts.add(context);
  console.warn(`[cloud-sync] ${context}`, err);
}

/* ─── Module-level flags ──────────────────────────────────── */

let suspended = false;
export function suspendCloudSync() {
  suspended = true;
}

// True mens loadFromServer kaller setState. Forhindrer at den nylig
// hentede serverdataen umiddelbart blir re-savet (subscribe → debounced
// save). Dekker BÅDE resumeData-setState og setLoaded-setState.
let isHydrating = false;

/* ─── Helpers ─────────────────────────────────────────────── */

/**
 * Plukk ut info om et fokusert felt — både stabil id (data-cv-field) og
 * menneske-lesbar label. fieldId brukes for DOM-matching på mottakersiden,
 * label vises i tooltip.
 */
function resolveFieldInfo(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): { label: string | null; fieldId: string | null } {
  const fieldId = el.getAttribute("data-cv-field");
  const label = resolveFieldLabel(el);
  return { label, fieldId };
}

function resolveFieldLabel(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): string | null {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();

  if (el.id) {
    const labelEl = document.querySelector<HTMLLabelElement>(
      `label[for="${el.id}"]`,
    );
    if (labelEl?.textContent) return labelEl.textContent.trim();
  }

  const wrapper = el.closest("label");
  if (wrapper?.textContent) {
    return wrapper.textContent.replace(el.value ?? "", "").trim();
  }

  // Søk etter <label> som søsken-element i samme container (vanlig form-mønster).
  const parent = el.parentElement;
  if (parent) {
    const labels = parent.querySelectorAll("label");
    if (labels.length === 1 && labels[0].textContent) {
      return labels[0].textContent.trim();
    }
  }

  const placeholder = (el as HTMLInputElement).placeholder;
  if (placeholder) return placeholder.trim();

  return null;
}

/**
 * Smelter sammen innkommende remote-state med lokal state og BEVARER
 * verdien i feltet brukeren har fokus på akkurat nå. Forhindrer at
 * remote-broadcast overskriver karakteren bruker nettopp skrev.
 *
 * Forventer fieldId på formatet `section.field`, f.eks. `contact.firstName`.
 * For andre nivåer (eksempel `experience.0.title`) faller den tilbake til
 * å returnere incoming uendret — feltet vil bli overskrevet og bruker må
 * skrive på nytt. Det er sjeldent siden de fleste data-cv-field-attributene
 * er på 2 nivåer.
 */
function mergeKeepingFocusedField(
  current: ResumeData,
  incoming: ResumeData,
  fieldId: string,
): ResumeData {
  const parts = fieldId.split(".");
  if (parts.length !== 2) return incoming;
  const [section, key] = parts;
  const cur = current as unknown as Record<string, unknown>;
  const inc = incoming as unknown as Record<string, unknown>;
  if (!(section in inc) || !(section in cur)) return incoming;
  const curSec = cur[section];
  const incSec = inc[section];
  if (
    typeof curSec !== "object" ||
    curSec === null ||
    typeof incSec !== "object" ||
    incSec === null
  ) {
    return incoming;
  }
  const mergedSection = {
    ...(incSec as Record<string, unknown>),
    [key]: (curSec as Record<string, unknown>)[key],
  };
  return {
    ...incoming,
    [section]: mergedSection,
  } as ResumeData;
}

/* ─── The hook ────────────────────────────────────────────── */

export function useCloudSync({ enabled = true }: { enabled?: boolean } = {}) {
  const user = useAuthStore((s) => s.user);
  const impersonatedBy = useAuthStore((s) => s.impersonatedBy);
  const loadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  /* ── Fetch data from server and hydrate stores ─────────── */
  const loadFromServer = useCallback(
    async (expectedEmail: string | null) => {
      try {
        const res = await fetch("/api/user/data", { cache: "no-store" });
        if (!res.ok) {
          useResumeStore.getState().setLoaded(true);
          loadedRef.current = true;
          return;
        }
        const data: ServerData = await res.json();

        // Session-email-mismatch (klient vs server) er fortsatt en defense
        // mot at en annen brukers CV hydreres inn i editoren. VIKTIG: IKKE
        // marker som lastet her. Setter vi isLoaded=true ville editoren vist
        // tom default-state som en (forvirret) admin kunne redigere — og en
        // påfølgende auto-save går mot server-sesjonen (cookie = riktig
        // bruker), altså ville vi OVERSKREVET riktig brukers CV med tomt
        // innhold. Behold "Laster"-tilstanden og la neste forsøk (poll, eller
        // korrigert klient-identitet) hydrere når identitetene stemmer igjen.
        const serverEmail = data.debug?.sessionEmail ?? null;
        const norm = (s: string) => s.trim().toLowerCase();
        if (
          expectedEmail &&
          serverEmail &&
          norm(expectedEmail) !== norm(serverEmail)
        ) {
          console.warn("[CloudSync] Session-email mismatch — hopper over hydrering.", {
            expected: expectedEmail,
            server: serverEmail,
          });
          return;
        }

        // Bruker startet å skrive mens vi fetchet — IKKE overskriv lokale endringer.
        const statusAfter = useCloudSyncStore.getState().status;
        if (statusAfter === "dirty" || statusAfter === "saving") {
          if (!loadedRef.current) {
            useResumeStore.getState().setLoaded(true);
            loadedRef.current = true;
          }
          return;
        }

        // Hele hydrerings-blokken er inne i isHydrating så ALLE setState her
        // (inkl. setLoaded) skipper subscribe → debouncedSave.
        isHydrating = true;
        try {
          if (data.resumeData) {
            const rd = data.resumeData;
            if ("resumes" in rd && rd.resumes?.length) {
              useResumeStore.setState({
                resumes: rd.resumes,
                activeResumeId: rd.activeResumeId,
                _resumeDataMap: rd._resumeDataMap,
                data: rd._resumeDataMap[rd.activeResumeId] ?? rd.data,
              });
            } else if ("data" in rd && rd.data) {
              const id = "resume-default";
              useResumeStore.setState({
                resumes: [{ id, name: "Min CV", createdAt: new Date().toISOString() }],
                activeResumeId: id,
                _resumeDataMap: { [id]: rd.data },
                data: rd.data,
              });
            }
          }
          if (!useResumeStore.getState().isLoaded) {
            useResumeStore.getState().setLoaded(true);
          }
        } finally {
          isHydrating = false;
        }
        loadedRef.current = true;

        // Status: bare gå til "idle"/"saved" hvis ikke bruker startet skriving
        // (status="dirty") i akkurat samme microtask. setStatus selv trigger
        // ikke subscribe i useResumeStore.
        const currentStatus = useCloudSyncStore.getState().status;
        if (currentStatus !== "dirty" && currentStatus !== "saving") {
          useCloudSyncStore.getState().setStatus("idle");
        }
      } catch (err) {
        console.error("[CloudSync] Failed to load:", err);
        useResumeStore.getState().setLoaded(true);
        loadedRef.current = true;
      }
    },
    [],
  );

  /* ── Save current state to server ──────────────────────── */
  const saveToServer = useCallback(async () => {
    if (suspended) return;
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    const sync = useCloudSyncStore.getState();
    sync.setStatus("saving");
    sync.setLastError(null);

    try {
      const rs = useResumeStore.getState();
      const resumeData: ResumePayloadV2 = {
        resumes: rs.resumes,
        activeResumeId: rs.activeResumeId,
        _resumeDataMap: { ...rs._resumeDataMap, [rs.activeResumeId]: rs.data },
        data: rs.data,
      };

      const res = await fetch("/api/user/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const code = payload?.error?.code ?? `http_${res.status}`;
        useCloudSyncStore.getState().setLastError(code);
        useCloudSyncStore.getState().setStatus("error");
        console.warn("[CloudSync] Save failed:", code, payload);
        return;
      }

      useCloudSyncStore.getState().setLastSavedAt(Date.now());
      useCloudSyncStore.getState().setStatus("saved");

      // Broadcast er FRIKOBLET fra save og fyrer på sin egen 50ms-debounce
      // i debouncedBroadcast. Vi venter ikke på Prisma-roundtripen for
      // collab-sync. Save-en her er bare persistensen.
    } catch (err) {
      console.error("[CloudSync] Failed to save:", err);
      useCloudSyncStore.getState().setLastError(
        err instanceof Error ? err.message : "network",
      );
      useCloudSyncStore.getState().setStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  /* ── Broadcast: rask collab-sync, IKKE knyttet til save ── */
  const broadcastChange = useCallback(() => {
    if (suspended) return;
    if (isHydrating) return;
    if (!loadedRef.current) return;
    const ch = channelRef.current;
    if (!ch) return;
    const rs = useResumeStore.getState();
    const resumeData: ResumePayloadV2 = {
      resumes: rs.resumes,
      activeResumeId: rs.activeResumeId,
      _resumeDataMap: { ...rs._resumeDataMap, [rs.activeResumeId]: rs.data },
      data: rs.data,
    };
    ch.send({
      type: "broadcast",
      event: "cv-updated",
      payload: { from: CLIENT_ID, at: Date.now(), state: resumeData },
    }).catch((err) => logSyncError("broadcast cv-updated", err));
  }, []);

  const debouncedBroadcast = useCallback(() => {
    if (suspended || isHydrating || !loadedRef.current) return;
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
    broadcastTimerRef.current = setTimeout(broadcastChange, BROADCAST_DEBOUNCE_MS);
  }, [broadcastChange]);

  /* ── Debounced save: persistens til Postgres, går saktere ── */
  const debouncedSave = useCallback(() => {
    if (suspended) return;
    if (isHydrating) return;
    if (!loadedRef.current) return;
    useCloudSyncStore.getState().setStatus("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToServer, SAVE_DEBOUNCE_MS);
  }, [saveToServer]);

  /* ── Load on login ─────────────────────────────────────── */
  useEffect(() => {
    if (!enabled) return;
    if (user) {
      loadFromServer(user.email ?? null);
    } else {
      loadedRef.current = false;
      useResumeStore.getState().setLoaded(false);
    }
  }, [enabled, user, loadFromServer]);

  /* ── Subscribe to store changes → broadcast OG auto-save ── */
  useEffect(() => {
    if (!enabled || !user) return;
    const unsubResume = useResumeStore.subscribe(() => {
      debouncedBroadcast();
      debouncedSave();
    });
    return () => unsubResume();
  }, [enabled, user, debouncedBroadcast, debouncedSave]);

  /* ── Supabase Realtime Broadcast + Presence for live collab ─── */
  useEffect(() => {
    if (!enabled || !user?.id) return;

    const supabase = supabaseBrowser();
    const channel = supabase.channel(`cv:${user.id}`, {
      config: {
        broadcast: { self: false },
        presence: { key: CLIENT_ID },
      },
    });

    // Hjelper: bygg en liste av alle andre klienter, gruppert per clientId.
    function refreshCollaborators() {
      const state = channel.presenceState<PresenceMeta>();
      const list: import("@/store/useCloudSyncStore").Collaborator[] = [];
      for (const key in state) {
        const entries = state[key];
        if (!entries?.length) continue;
        const meta = entries[0]; // siste track-call vinner
        if (meta.clientId === CLIENT_ID) continue; // ikke vis seg selv
        list.push({
          clientId: meta.clientId,
          userId: meta.userId,
          email: meta.email,
          name: meta.name,
          avatarUrl: meta.avatarUrl ?? null,
          step: meta.step,
          focusLabel: meta.focusLabel ?? null,
          focusFieldId: meta.focusFieldId ?? null,
          impersonating: meta.impersonating,
          joinedAt: meta.joinedAt,
        });
      }
      useCloudSyncStore.getState().setCollaborators(list);
    }

    // Lokal focus-state holdes i en let så vi kan re-tracke med oppdatert
    // info uten å trigge subscribe-loops.
    let currentFocusLabel: string | null = null;
    let currentFocusFieldId: string | null = null;

    function buildMeta(): PresenceMeta {
      const identity = impersonatedBy ?? user!;
      return {
        clientId: CLIENT_ID,
        userId: user!.id,
        email: identity.email,
        name: identity.name,
        avatarUrl: identity.avatarUrl ?? null,
        step: useCloudSyncStore.getState().currentStep,
        focusLabel: currentFocusLabel,
        focusFieldId: currentFocusFieldId,
        impersonating: !!impersonatedBy,
        joinedAt: Date.now(),
      };
    }

    channel
      .on("broadcast", { event: "cv-updated" }, (msg) => {
        const payload = msg.payload as
          | {
              from?: string;
              at?: number;
              state?: ResumePayloadV2;
            }
          | undefined;
        if (!payload || payload.from === CLIENT_ID) return; // eget ekko

        // Hvis avsenderen sendte full state-payload kan vi applye direkte
        // uten å gjøre en ekstra GET-roundtrip. Tidligere droppet vi hele
        // applikasjonen hvis vi var dirty/saving — det skapte 10-sek lag
        // fordi droppen aldri ble fanget før polling. Nå MERGER vi inn alle
        // felter remote har endret, men BEHOLDER vår lokale verdi i feltet
        // vi har fokus på akkurat nå (så et tastetrykk vi nettopp gjorde
        // ikke blir overskrevet).
        if (payload.state) {
          const rd = payload.state;
          const focusedEl = document.activeElement as HTMLElement | null;
          const focusedFieldId =
            focusedEl?.getAttribute("data-cv-field") ?? null;

          isHydrating = true;
          try {
            const incomingActive =
              rd._resumeDataMap[rd.activeResumeId] ?? rd.data;
            const currentActive = useResumeStore.getState().data;
            const merged = focusedFieldId
              ? mergeKeepingFocusedField(
                  currentActive,
                  incomingActive,
                  focusedFieldId,
                )
              : incomingActive;
            useResumeStore.setState({
              resumes: rd.resumes,
              activeResumeId: rd.activeResumeId,
              _resumeDataMap: {
                ...rd._resumeDataMap,
                [rd.activeResumeId]: merged,
              },
              data: merged,
            });
          } finally {
            isHydrating = false;
          }
          // Bare oppdater status hvis vi ikke har en lokal save på gang —
          // ellers ville indikatoren feilaktig vist "saved" mens vi
          // faktisk har ulagrede lokale endringer.
          const currentStatus = useCloudSyncStore.getState().status;
          if (currentStatus !== "dirty" && currentStatus !== "saving") {
            useCloudSyncStore.getState().setLastSavedAt(Date.now());
            useCloudSyncStore.getState().setStatus("saved");
          }
          return;
        }

        // Fallback (gamle klienter / payload uten state): refetch.
        loadFromServer(user.email ?? null);
      })
      .on("broadcast", { event: "cursor" }, (msg) => {
        const p = msg.payload as
          | { clientId: string; xPct: number; yPct: number }
          | undefined;
        if (!p || p.clientId === CLIENT_ID) return;
        // Skriv direkte til DOM via CSS custom properties for å unngå
        // React-render storm. LiveCursorsLayer renderer ett <div> per
        // collaborator; vi oppdaterer bare transform-variablene her.
        if (typeof window === "undefined") return;
        const el = document.querySelector<HTMLElement>(
          `[data-cursor-id="${p.clientId}"]`,
        );
        if (!el) return;
        const x = Math.round(p.xPct * window.innerWidth);
        const y = Math.round(p.yPct * window.innerHeight);
        el.style.setProperty("--cursor-x", `${x}px`);
        el.style.setProperty("--cursor-y", `${y}px`);
        el.style.opacity = "1";
      })
      .on("presence", { event: "sync" }, refreshCollaborators)
      .on("presence", { event: "join" }, refreshCollaborators)
      .on("presence", { event: "leave" }, refreshCollaborators)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel
            .track(buildMeta())
            .catch((err) => logSyncError("presence track (subscribe)", err));
        }
      });

    // Global focus-listener: når en input/textarea får fokus, finn
    // tilhørende <label>-tekst eller placeholder/aria-label og kringkast
    // det via presence så andre ser "X redigerer 'Fornavn'".
    const focusHandler = (ev: FocusEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement) &&
        !(target instanceof HTMLSelectElement)
      )
        return;
      const info = resolveFieldInfo(target);
      currentFocusLabel = info.label;
      currentFocusFieldId = info.fieldId;
      channel.track(buildMeta()).catch((err) => logSyncError("presence track (focus)", err));
    };
    const blurHandler = () => {
      if (currentFocusLabel === null && currentFocusFieldId === null) return;
      currentFocusLabel = null;
      currentFocusFieldId = null;
      channel.track(buildMeta()).catch((err) => logSyncError("presence track (blur)", err));
    };
    window.addEventListener("focusin", focusHandler);
    window.addEventListener("focusout", blurHandler);

    // Mouse-broadcast throttlet til 30ms (~33fps). Sender viewport-%-
    // koordinater så ulike skjermstørrelser ser hverandres cursors
    // proporsjonalt.
    let lastCursorSent = 0;
    const cursorHandler = (ev: MouseEvent) => {
      const now = Date.now();
      if (now - lastCursorSent < 30) return;
      lastCursorSent = now;
      const xPct = ev.clientX / window.innerWidth;
      const yPct = ev.clientY / window.innerHeight;
      channel
        .send({
          type: "broadcast",
          event: "cursor",
          payload: { clientId: CLIENT_ID, xPct, yPct },
        })
        .catch((err) => logSyncError("broadcast cursor", err));
    };
    window.addEventListener("mousemove", cursorHandler);

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      window.removeEventListener("focusin", focusHandler);
      window.removeEventListener("focusout", blurHandler);
      window.removeEventListener("mousemove", cursorHandler);
      useCloudSyncStore.getState().setCollaborators([]);
      supabase.removeChannel(channel);
    };
    // impersonatedBy er med i deps så channel re-trackes når admin går inn/ut
    // av impersonering. user?.id holder seg gjennom hard-nav.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user?.id, user?.email, impersonatedBy?.id, loadFromServer]);

  /* ── Re-track presence når currentStep endres ──────────── */
  useEffect(() => {
    if (!enabled || !user?.id) return;
    const unsub = useCloudSyncStore.subscribe((state, prev) => {
      if (state.currentStep === prev.currentStep) return;
      const ch = channelRef.current;
      if (!ch) return;
      const identity = impersonatedBy ?? user;
      ch.track({
        clientId: CLIENT_ID,
        userId: user.id,
        email: identity.email,
        name: identity.name,
        avatarUrl: identity.avatarUrl ?? null,
        step: state.currentStep,
        focusLabel: null,
        focusFieldId: null,
        impersonating: !!impersonatedBy,
        joinedAt: Date.now(),
      } satisfies PresenceMeta).catch((err) =>
        logSyncError("presence re-track (step)", err),
      );
    });
    return () => unsub();
  }, [enabled, user, impersonatedBy]);

  /* ── Fallback polling 30s hvis broadcast skulle dø ───────── */
  useEffect(() => {
    if (!enabled || !user) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const status = useCloudSyncStore.getState().status;
      if (status === "dirty" || status === "saving") return;
      loadFromServer(user.email ?? null);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [enabled, user, loadFromServer]);

  /* ── Save immediately before page unload ───────────────── */
  useEffect(() => {
    if (!enabled || !user) return;

    const handleBeforeUnload = () => {
      if (suspended) return;
      if (!loadedRef.current) return;
      const rs = useResumeStore.getState();
      const resumeData: ResumePayloadV2 = {
        resumes: rs.resumes,
        activeResumeId: rs.activeResumeId,
        _resumeDataMap: { ...rs._resumeDataMap, [rs.activeResumeId]: rs.data },
        data: rs.data,
      };
      navigator.sendBeacon(
        "/api/user/data",
        new Blob([JSON.stringify({ resumeData })], { type: "application/json" }),
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, user]);
}
