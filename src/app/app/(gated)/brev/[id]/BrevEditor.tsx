"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertCircle, Download } from "lucide-react";
import { SectionLabel } from "@/components/ui/Pill";
import { AiDraftButton } from "./AiDraftButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { InviteButton } from "@/components/collab/InviteButton";
import { OwnerCollabBridge } from "@/components/collab/OwnerCollabBridge";
import { cn } from "@/lib/cn";

const LexicalEditor = dynamic(
  () => import("@/components/forms/LexicalEditor").then((m) => m.LexicalEditor),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full rounded-xl" /> },
);

type Letter = {
  id: string;
  applicationId: string;
  senderName: string | null;
  senderEmail: string | null;
  senderPhone: string | null;
  senderLocation: string | null;
  recipientName: string | null;
  recipientTitle: string | null;
  companyAddress: string | null;
  date: string | null;
  subject: string | null;
  greeting: string | null;
  body: string | null;
  closing: string | null;
  fontFamily: string;
  accentColor: string;
  fontSize: string;
};

const INPUT =
  "w-full bg-bg border border-black/8 dark:border-white/8 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-accent";
const LABEL = "text-[11px] uppercase tracking-wider text-ink/55 block mb-2";

/* ─── Preview-rendring ────────────────────────────────────────
   Avsender/dato/mottaker/emne/hilsen/brødtekst/avslutning settes
   sammen til ett A4-aktig dokument. Brødtekst er Lexical-HTML og
   rendres som markup (ikke flat tekst). Font/størrelse/aksentfarge
   styres av de lagrede verdiene slik at "Utforming"-kortet får
   faktisk effekt — samme avbildning brukes både i live-preview og
   i "Last ned"-dokumentet for å unngå drift.
─────────────────────────────────────────────────────────────── */

const FONT_STACKS: Record<string, string> = {
  geist:
    "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
  inter: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  system: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
};

const FONT_SIZES: Record<string, number> = {
  small: 13,
  medium: 15,
  large: 17,
};

function fontStack(fontFamily: string): string {
  return FONT_STACKS[fontFamily] ?? FONT_STACKS.geist;
}

function baseFontSize(fontSize: string): number {
  return FONT_SIZES[fontSize] ?? FONT_SIZES.medium;
}

/** Norsk lesbar dato fra ISO (yyyy-MM-dd). Faller tilbake til råverdi. */
function formatDate(value: string | null): string {
  if (!value) return "";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!iso) return value;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function BrevEditor({
  application,
  initial,
}: {
  application: { id: string; companyName: string; title: string };
  initial: Letter;
}) {
  const [letter, setLetter] = useState<Letter>(initial);
  const [editorKey, setEditorKey] = useState(0);
  const [streamText, setStreamText] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const timer = useRef<NodeJS.Timeout | null>(null);

  // Debounced auto-save on any change after first user edit.
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter]);

  function update<K extends keyof Letter>(key: K, value: Letter[K]) {
    dirtyRef.current = true;
    setLetter((l) => ({ ...l, [key]: value }));
  }

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch(
        `/api/applications/${application.id}/cover-letter`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(letter),
        },
      );
      if (!res.ok) throw new Error("save failed");
      setLastSaved(new Date());
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  function htmlToPlain(html: string): string {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.innerText.trim();
  }

  function copyLetter() {
    const lines: string[] = [];

    const senderLine = [letter.senderEmail, letter.senderPhone, letter.senderLocation]
      .filter(Boolean)
      .join(" | ");
    if (letter.senderName) lines.push(`Fra: ${letter.senderName}`);
    if (senderLine) lines.push(senderLine);
    lines.push("");

    const recipientLine = [letter.recipientName, letter.recipientTitle]
      .filter(Boolean)
      .join(", ");
    if (recipientLine) lines.push(`Til: ${recipientLine}`);
    if (letter.companyAddress) lines.push(letter.companyAddress);
    lines.push("");

    if (letter.date) lines.push(letter.date, "");
    if (letter.subject) lines.push(`Emne: ${letter.subject}`, "");
    if (letter.greeting) lines.push(letter.greeting, "");

    const bodyText = letter.body ? htmlToPlain(letter.body) : "";
    if (bodyText) lines.push(bodyText, "");

    if (letter.closing) lines.push(letter.closing);
    if (letter.senderName) lines.push(letter.senderName);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // "Last ned": åpner et selvstendig vindu med dokumentet og kaller print.
  // Bevisst egen HTML-streng (ikke app-ens DOM) så app-ens print-CSS for CV
  // ikke kolliderer, og brukeren kan velge "Lagre som PDF".
  function downloadLetter() {
    const doc = buildPrintDocument(letter, application);
    const win = window.open("", "_blank", "width=820,height=1060");
    if (!win) return;
    win.document.open();
    win.document.write(doc);
    win.document.close();
  }

  const savedLabel =
    status === "saving"
      ? "Lagrer …"
      : status === "error"
        ? "Kunne ikke lagre"
        : lastSaved
          ? `Lagret for ${Math.max(1, Math.round((Date.now() - lastSaved.getTime()) / 1000))}s siden`
          : "Endringer lagres automatisk";

  return (
    <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-6 md:py-10 space-y-6">
      <div className="flex items-center gap-2 text-[12px] text-ink/55">
        <Link href="/app/brev" className="hover:text-accent">
          Brev
        </Link>
        <span>/</span>
        <Link
          href={`/app/pipeline/${application.id}`}
          className="hover:text-accent truncate"
        >
          {application.companyName}
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <SectionLabel className="mb-3">Søknadsbrev</SectionLabel>
          <h1 className="text-[28px] md:text-[36px] leading-[1] tracking-[-0.03em] font-medium">
            {application.title}
          </h1>
          <p className="text-[14px] text-ink/60 mt-2">
            For {application.companyName}
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <span
            aria-live="polite"
            className={
              status === "error"
                ? "inline-flex items-center gap-1 text-[11px] text-accent"
                : "text-[11px] text-ink/45"
            }
          >
            {status === "error" && (
              <AlertCircle size={12} aria-hidden="true" />
            )}
            {savedLabel}
          </span>
          <InviteButton
            resourceKind="letter"
            resourceId={application.id}
            resourceTitle={`Søknadsbrev: ${application.title}`}
            variant="compact"
          />
          <button
            onClick={downloadLetter}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 text-ink/80 text-[11px] font-medium hover:bg-panel transition-colors"
          >
            <Download size={12} aria-hidden="true" />
            Last ned
          </button>
          <button
            onClick={copyLetter}
            className="px-3 py-1.5 rounded-full bg-accent text-bg text-[11px] font-medium hover:bg-accent-hover transition-colors"
          >
            {copied ? "Kopiert!" : "Kopier som tekst"}
          </button>
        </div>
      </div>

      <OwnerCollabBridge resourceKind="letter" resourceId={application.id} />

      {/* Mobil: fane-veksling mellom redigering og forhåndsvisning. */}
      <div
        role="tablist"
        aria-label="Visning"
        className="flex xl:hidden gap-1 p-1 bg-panel rounded-full w-fit"
      >
        {(["edit", "preview"] as const).map((v) => {
          const active = mobileView === v;
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setMobileView(v)}
              className={cn(
                "px-4 py-2 rounded-full text-[12px] transition-colors",
                active
                  ? "bg-surface text-ink font-medium shadow-sm"
                  : "text-ink/60 hover:text-ink",
              )}
            >
              {v === "edit" ? "Rediger" : "Forhåndsvis"}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)] gap-5">
        {/* Redigering */}
        <div
          className={cn(
            "grid grid-cols-1 lg:grid-cols-3 gap-5",
            mobileView === "preview" && "hidden xl:grid",
          )}
        >
          {/* Left: meta */}
          <div className="lg:col-span-1 space-y-5">
            <Card title="Avsender">
              <Field
                label="Navn"
                value={letter.senderName ?? ""}
                onChange={(v) => update("senderName", v || null)}
              />
              <Field
                label="E-post"
                type="email"
                value={letter.senderEmail ?? ""}
                onChange={(v) => update("senderEmail", v || null)}
              />
              <Field
                label="Telefon"
                value={letter.senderPhone ?? ""}
                onChange={(v) => update("senderPhone", v || null)}
              />
              <Field
                label="Sted"
                value={letter.senderLocation ?? ""}
                onChange={(v) => update("senderLocation", v || null)}
              />
            </Card>

            <Card title="Mottaker">
              <Field
                label="Kontaktperson"
                value={letter.recipientName ?? ""}
                onChange={(v) => update("recipientName", v || null)}
              />
              <Field
                label="Stilling"
                value={letter.recipientTitle ?? ""}
                onChange={(v) => update("recipientTitle", v || null)}
              />
              <Field
                label="Selskap/adresse"
                value={letter.companyAddress ?? ""}
                onChange={(v) => update("companyAddress", v || null)}
              />
            </Card>

            <Card title="Utforming">
              <Field
                label="Dato"
                type="date"
                value={letter.date ?? ""}
                onChange={(v) => update("date", v || null)}
              />
              <div>
                <label className={LABEL}>Font</label>
                <select
                  value={letter.fontFamily}
                  onChange={(e) => update("fontFamily", e.target.value)}
                  className={INPUT}
                >
                  <option value="geist">Geist (sans)</option>
                  <option value="inter">Inter (sans)</option>
                  <option value="georgia">Georgia (serif)</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Størrelse</label>
                <select
                  value={letter.fontSize}
                  onChange={(e) => update("fontSize", e.target.value)}
                  className={INPUT}
                >
                  <option value="small">Liten</option>
                  <option value="medium">Middels</option>
                  <option value="large">Stor</option>
                </select>
              </div>
              <div>
                <label className={LABEL} htmlFor="accent-color">
                  Aksentfarge
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="accent-color"
                    type="color"
                    value={letter.accentColor}
                    onChange={(e) => update("accentColor", e.target.value)}
                    className="h-9 w-12 rounded-lg border border-black/8 dark:border-white/8 bg-bg cursor-pointer"
                    aria-label="Aksentfarge for navn og emne i brevet"
                  />
                  <span className="text-[12px] text-ink/55 tabular-nums uppercase">
                    {letter.accentColor}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: body */}
          <div className="lg:col-span-2 space-y-4">
            <Card title="Innhold">
              <Field
                label="Emne"
                value={letter.subject ?? ""}
                onChange={(v) => update("subject", v || null)}
              />
              <Field
                label="Hilsen"
                value={letter.greeting ?? ""}
                onChange={(v) => update("greeting", v || null)}
              />
              <div>
                <div className="flex items-end justify-between mb-2">
                  <label className={LABEL.replace("block mb-2", "")}>Brødtekst</label>
                  <AiDraftButton
                    applicationId={application.id}
                    letter={{
                      senderName: letter.senderName,
                      senderEmail: letter.senderEmail,
                      senderPhone: letter.senderPhone,
                      senderLocation: letter.senderLocation,
                      recipientName: letter.recipientName,
                      recipientTitle: letter.recipientTitle,
                      companyAddress: letter.companyAddress,
                    }}
                    onStream={(text) => setStreamText(text)}
                    onDraft={(html) => {
                      dirtyRef.current = true;
                      setLetter((l) => ({ ...l, body: html }));
                      setEditorKey((k) => k + 1);
                    }}
                  />
                </div>
                {streamText !== null ? (
                  <StreamingPreview text={streamText} minHeight="min-h-[320px]" />
                ) : (
                  <LexicalEditor
                    key={editorKey}
                    value={letter.body ?? ""}
                    onChange={(v) => update("body", v)}
                    placeholder="Kjære rekrutterer, …"
                  />
                )}
              </div>
              <Field
                label="Avslutning"
                value={letter.closing ?? ""}
                onChange={(v) => update("closing", v || null)}
              />
            </Card>
          </div>
        </div>

        {/* Live-preview: egen sticky kolonne på desktop, fane på mobil. */}
        <div
          className={cn(
            "xl:sticky xl:top-6 xl:self-start",
            mobileView === "edit" && "hidden xl:block",
          )}
        >
          <LetterPreview letter={letter} />
        </div>
      </div>
    </div>
  );
}

function LetterPreview({ letter }: { letter: Letter }) {
  const senderContact = [letter.senderEmail, letter.senderPhone, letter.senderLocation]
    .filter(Boolean)
    .join("  ·  ");
  const recipientLine = [letter.recipientName, letter.recipientTitle]
    .filter(Boolean)
    .join(", ");
  const dateLabel = formatDate(letter.date);
  const size = baseFontSize(letter.fontSize);

  return (
    <div className="space-y-2">
      <SectionLabel>Forhåndsvisning</SectionLabel>
      <div
        aria-label="Forhåndsvisning av brevet"
        className="bg-white text-[#1a1a1a] rounded-lg shadow-[0_2px_24px_rgba(20,17,14,0.12)] border border-black/8 overflow-hidden mx-auto"
        style={{
          fontFamily: fontStack(letter.fontFamily),
          fontSize: `${size}px`,
          lineHeight: 1.6,
          aspectRatio: "210 / 297",
          maxWidth: "520px",
          width: "100%",
        }}
      >
        <div
          className="h-full overflow-y-auto"
          style={{ padding: "min(8%, 44px)" }}
        >
          {/* Avsender + dato */}
          <header className="flex items-start justify-between gap-4 mb-8">
            <div>
              {letter.senderName && (
                <p
                  className="font-semibold tracking-tight"
                  style={{ color: letter.accentColor, fontSize: `${size + 4}px` }}
                >
                  {letter.senderName}
                </p>
              )}
              {senderContact && (
                <p className="mt-1 text-[#555]" style={{ fontSize: `${size - 3}px` }}>
                  {senderContact}
                </p>
              )}
            </div>
            {dateLabel && (
              <p
                className="text-[#555] whitespace-nowrap"
                style={{ fontSize: `${size - 3}px` }}
              >
                {dateLabel}
              </p>
            )}
          </header>

          {/* Mottaker */}
          {(recipientLine || letter.companyAddress) && (
            <section className="mb-8" style={{ fontSize: `${size - 1}px` }}>
              {recipientLine && <p className="font-medium">{recipientLine}</p>}
              {letter.companyAddress && (
                <p className="whitespace-pre-line text-[#444]">
                  {letter.companyAddress}
                </p>
              )}
            </section>
          )}

          {/* Emne */}
          {letter.subject && (
            <p
              className="font-semibold mb-6 pb-2 border-b"
              style={{
                color: letter.accentColor,
                borderColor: letter.accentColor,
              }}
            >
              {letter.subject}
            </p>
          )}

          {/* Hilsen */}
          {letter.greeting && <p className="mb-4">{letter.greeting}</p>}

          {/* Brødtekst — rendrer Lexical-HTML som markup. */}
          {letter.body ? (
            <div
              className="letter-body"
              // Brødtekst er brukerens eget innhold, generert via Lexical
              // ($generateHtmlFromNodes). Samme tillit som "Kopier"-flyten.
              dangerouslySetInnerHTML={{ __html: letter.body }}
            />
          ) : (
            <p className="text-[#999] italic">
              Brødteksten vises her når du skriver i editoren.
            </p>
          )}

          {/* Avslutning + signatur */}
          {(letter.closing || letter.senderName) && (
            <div className="mt-8">
              {letter.closing && <p>{letter.closing}</p>}
              {letter.senderName && (
                <p className="font-medium mt-1">{letter.senderName}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Brødtekst-styling for forhåndsvisningen. Scopet til .letter-body
          slik at app-ens øvrige typografi ikke påvirkes. */}
      <style>{`
        .letter-body p { margin: 0 0 0.9em; }
        .letter-body p:last-child { margin-bottom: 0; }
        .letter-body ul { list-style: disc; margin: 0 0 0.9em 1.4em; }
        .letter-body ol { list-style: decimal; margin: 0 0 0.9em 1.4em; }
        .letter-body li { margin-bottom: 0.25em; }
        .letter-body b, .letter-body strong { font-weight: 600; }
        .letter-body i, .letter-body em { font-style: italic; }
        .letter-body u { text-decoration: underline; }
        .letter-body a { color: ${letter.accentColor}; }
      `}</style>
    </div>
  );
}

/** Bygger en selvstendig HTML-streng for "Last ned" (print-til-PDF). */
function buildPrintDocument(
  letter: Letter,
  application: { title: string; companyName: string },
): string {
  const size = baseFontSize(letter.fontSize);
  const accent = escapeHtml(letter.accentColor);
  const font = fontStack(letter.fontFamily);

  const senderContact = [letter.senderEmail, letter.senderPhone, letter.senderLocation]
    .filter(Boolean)
    .map((v) => escapeHtml(v as string))
    .join("  ·  ");
  const recipientLine = [letter.recipientName, letter.recipientTitle]
    .filter(Boolean)
    .map((v) => escapeHtml(v as string))
    .join(", ");
  const dateLabel = escapeHtml(formatDate(letter.date));
  const docTitle = escapeHtml(
    `${letter.subject || application.title} – ${application.companyName}`,
  );

  const header = `
    <header class="hdr">
      <div>
        ${letter.senderName ? `<p class="name">${escapeHtml(letter.senderName)}</p>` : ""}
        ${senderContact ? `<p class="muted small">${senderContact}</p>` : ""}
      </div>
      ${dateLabel ? `<p class="muted small">${dateLabel}</p>` : ""}
    </header>`;

  const recipient =
    recipientLine || letter.companyAddress
      ? `<section class="recipient">
          ${recipientLine ? `<p class="med">${recipientLine}</p>` : ""}
          ${letter.companyAddress ? `<p class="muted pre">${escapeHtml(letter.companyAddress)}</p>` : ""}
        </section>`
      : "";

  const subject = letter.subject
    ? `<p class="subject">${escapeHtml(letter.subject)}</p>`
    : "";
  const greeting = letter.greeting
    ? `<p class="greeting">${escapeHtml(letter.greeting)}</p>`
    : "";
  // Brødtekst er Lexical-generert HTML — rendres som markup, identisk med live-preview.
  const body = letter.body ? `<div class="body">${letter.body}</div>` : "";
  const sign =
    letter.closing || letter.senderName
      ? `<div class="sign">
          ${letter.closing ? `<p>${escapeHtml(letter.closing)}</p>` : ""}
          ${letter.senderName ? `<p class="med">${escapeHtml(letter.senderName)}</p>` : ""}
        </div>`
      : "";

  return `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${docTitle}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f4f4f4; }
  body {
    font-family: ${font};
    font-size: ${size}px;
    line-height: 1.6;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 24px auto;
    padding: 22mm 20mm;
    background: #fff;
    box-shadow: 0 2px 24px rgba(0,0,0,0.12);
  }
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 32px; }
  .name { margin: 0; font-weight: 600; font-size: ${size + 4}px; color: ${accent}; }
  .small { font-size: ${size - 3}px; }
  .med { font-weight: 500; }
  .muted { color: #555; }
  .pre { white-space: pre-line; }
  .recipient { margin-bottom: 32px; }
  .recipient p { margin: 0 0 2px; }
  .subject { font-weight: 600; color: ${accent}; border-bottom: 1px solid ${accent}; padding-bottom: 8px; margin: 0 0 24px; }
  .greeting { margin: 0 0 16px; }
  .body p { margin: 0 0 0.9em; }
  .body ul { list-style: disc; margin: 0 0 0.9em 1.4em; }
  .body ol { list-style: decimal; margin: 0 0 0.9em 1.4em; }
  .body li { margin-bottom: 0.25em; }
  .body b, .body strong { font-weight: 600; }
  .body i, .body em { font-style: italic; }
  .body a { color: ${accent}; }
  .sign { margin-top: 32px; }
  .sign p { margin: 0; }
  @media print {
    html, body { background: #fff; }
    .page { margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 0; }
  }
</style>
</head>
<body>
  <main class="page">
    ${header}
    ${recipient}
    ${subject}
    ${greeting}
    ${body}
    ${sign}
  </main>
  <script>
    window.addEventListener("load", function () {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`;
}

function StreamingPreview({
  text,
  minHeight = "min-h-[160px]",
}: {
  text: string;
  minHeight?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl bg-surface border border-accent overflow-hidden ${minHeight}`}
    >
      <div className="px-5 py-4 text-[14px] text-ink leading-[1.6] whitespace-pre-wrap">
        {text ? (
          <>
            {text}
            <span className="inline-block w-[2px] h-[0.9em] bg-accent ml-[2px] align-[-0.05em] animate-pulse" />
          </>
        ) : (
          <span className="text-ink/35 animate-pulse">AI skriver …</span>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-black/8 dark:border-white/8 p-5 md:p-6 space-y-4">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      />
    </div>
  );
}
