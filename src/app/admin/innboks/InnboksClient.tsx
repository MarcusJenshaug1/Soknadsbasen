"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Inbox, Send, RefreshCw, PenSquare, Reply, X, ChevronLeft,
  FolderOpen, FolderPlus, Folder, MoreHorizontal, Trash2, Check,
  Archive, ChevronRight, Sparkles, User, Loader2, AlertCircle,
} from "lucide-react";

const EmailEditor = dynamic(
  () => import("@/components/email-editor/EmailEditor").then((m) => m.EmailEditor),
  { ssr: false, loading: () => <div className="flex-1 px-4 py-3 text-[13px] text-ink/30">Laster editor…</div> },
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface InboundEmail {
  id: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  messageId: string | null;
  folderId: string | null;
  archived: boolean;
  receivedAt: string;
}

interface SentEmail {
  id: string;
  toAddress: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  inReplyTo: string | null;
  folderId: string | null;
  archived: boolean;
  sentAt: string;
}

interface EmailFolder {
  id: string;
  name: string;
  parentId: string | null;
}

type FolderView = "inbox" | "sent" | "archived" | string;
type FromType = "user" | "noreply" | "post";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

function fmtFull(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function buildFolderTree(folders: EmailFolder[]): (EmailFolder & { depth: number })[] {
  const result: (EmailFolder & { depth: number })[] = [];
  const add = (parentId: string | null, depth: number) => {
    folders
      .filter((f) => f.parentId === parentId)
      .forEach((f) => {
        result.push({ ...f, depth });
        add(f.id, depth + 1);
      });
  };
  add(null, 0);
  return result;
}

// ── Move menu ─────────────────────────────────────────────────────────────────

function MoveMenu({
  emailId, type, currentFolderId, folders, onMoved,
}: {
  emailId: string;
  type: "inbound" | "sent";
  currentFolderId: string | null;
  folders: EmailFolder[];
  onMoved: (folderId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function move(folderId: string | null) {
    setOpen(false);
    await fetch("/api/admin/innboks/move", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: emailId, type, folderId }),
    });
    onMoved(folderId);
  }

  const tree = buildFolderTree(folders);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/15 text-[12px] text-ink/60 hover:text-ink hover:border-black/30 transition-colors"
      >
        <Folder size={12} /> Flytt
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 w-52 bg-bg border border-black/10 rounded-xl shadow-lg overflow-hidden z-20">
          {currentFolderId && (
            <button
              onClick={() => move(null)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-ink/60 hover:bg-black/5 hover:text-ink transition-colors"
            >
              <Inbox size={12} /> Fjern fra mappe
            </button>
          )}
          {tree.length === 0 && (
            <p className="px-3 py-2 text-[12px] text-ink/30">Ingen mapper</p>
          )}
          {tree.map((f) => (
            <button
              key={f.id}
              onClick={() => move(f.id)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[12px] text-ink/70 hover:bg-black/5 hover:text-ink transition-colors"
              style={{ paddingLeft: `${12 + f.depth * 12}px` }}
            >
              <span className="flex items-center gap-2">
                <FolderOpen size={12} /> {f.name}
              </span>
              {currentFolderId === f.id && <Check size={11} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FROM selector ─────────────────────────────────────────────────────────────

function FromSelector({
  value, onChange, userName,
}: {
  value: FromType;
  onChange: (v: FromType) => void;
  userName: string | null;
}) {
  const firstName = userName?.split(" ")[0] ?? "Marcus";
  const options: { value: FromType; label: string }[] = [
    { value: "user", label: `${firstName} (din bruker)` },
    { value: "noreply", label: "noreply@søknadsbasen.no" },
    { value: "post", label: "post@søknadsbasen.no" },
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FromType)}
      className="bg-transparent text-[13px] outline-none text-ink/70 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Compose / reply ───────────────────────────────────────────────────────────

function ComposeForm({
  userName,
  defaultTo = "",
  defaultSubject = "",
  inReplyTo,
  threadText,
  onSent,
  onClose,
}: {
  userName: string | null;
  defaultTo?: string;
  defaultSubject?: string;
  inReplyTo?: string;
  threadText?: string;
  onSent: (sent: SentEmail) => void;
  onClose: () => void;
}) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");
  const [from, setFrom] = useState<FromType>("user");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const handleChange = useCallback((h: string, t: string) => {
    setHtml(h);
    setText(t);
  }, []);

  async function fetchAiSuggestion() {
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/innboks/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread: threadText, draft: text, subject }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "AI-feil"); return; }
      setAiSuggestion(data.text);
    } catch {
      setError("Kunne ikke nå AI");
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiSuggestion() {
    if (!aiSuggestion) return;
    // Convert plain text to minimal HTML for the editor
    const suggestionHtml = `<p>${aiSuggestion.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
    setHtml(suggestionHtml);
    setAiSuggestion(null);
    setEditorKey((k) => k + 1);
  }

  async function send() {
    if (!to || !subject || !html) { setError("Fyll inn mottaker, emne og melding"); return; }
    setSending(true); setError(null);
    try {
      const res = await fetch("/api/admin/innboks/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, html, text, inReplyTo, from }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Feil"); return; }
      onSent({
        id: data.id ?? crypto.randomUUID(),
        toAddress: to,
        subject,
        textBody: text,
        htmlBody: html,
        inReplyTo: inReplyTo ?? null,
        folderId: null,
        archived: false,
        sentAt: new Date().toISOString(),
      });
    } catch {
      setError("Noe gikk galt");
    } finally {
      setSending(false);
    }
  }

  const inp = "w-full bg-transparent text-[13px] outline-none placeholder:text-ink/30";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 shrink-0">
        <span className="text-[13px] font-medium">{inReplyTo ? "Svar" : "Ny e-post"}</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-black/5 text-ink/40 hover:text-ink">
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col divide-y divide-black/6 px-4 shrink-0">
        <div className="py-2.5 flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-ink/40 w-12 shrink-0">Fra</span>
          <FromSelector value={from} onChange={setFrom} userName={userName} />
        </div>
        <div className="py-2.5 flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-ink/40 w-12 shrink-0">Til</span>
          <input className={inp} value={to} onChange={(e) => setTo(e.target.value)} placeholder="navn@epost.no" />
        </div>
        <div className="py-2.5 flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-ink/40 w-12 shrink-0">Emne</span>
          <input className={inp} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Emne…" />
        </div>
      </div>

      {/* AI suggestion banner */}
      {aiSuggestion && (
        <div className="mx-4 mt-2 p-3 rounded-xl border border-amber-200 bg-amber-50 shrink-0">
          <p className="text-[12px] font-medium text-amber-800 mb-1.5 flex items-center gap-1.5">
            <Sparkles size={12} /> AI-forslag
          </p>
          <pre className="text-[12px] whitespace-pre-wrap text-ink/80 leading-relaxed max-h-32 overflow-y-auto">{aiSuggestion}</pre>
          <div className="flex gap-2 mt-2">
            <button
              onClick={applyAiSuggestion}
              className="px-3 py-1 rounded-full bg-amber-600 text-white text-[11px] font-medium hover:bg-amber-700 transition-colors"
            >
              Bruk forslaget
            </button>
            <button
              onClick={() => setAiSuggestion(null)}
              className="px-3 py-1 rounded-full text-[11px] text-ink/50 hover:text-ink transition-colors"
            >
              Avvis
            </button>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <EmailEditor
          key={editorKey}
          onChange={handleChange}
          autoFocus
          className="flex-1 min-h-0"
        />
      </div>

      {error && (
        <div className="px-4 pb-1 flex items-center gap-1.5 text-[12px] text-red-600 shrink-0">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      <div className="px-4 py-3 border-t border-black/8 shrink-0 flex items-center gap-2">
        <button
          onClick={send}
          disabled={sending}
          className="px-5 py-2 rounded-full bg-ink text-bg text-[13px] font-medium disabled:opacity-40 flex items-center gap-2 hover:opacity-85 transition-opacity"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {sending ? "Sender…" : "Send"}
        </button>
        <button
          onClick={fetchAiSuggestion}
          disabled={aiLoading}
          className="px-4 py-2 rounded-full border border-black/15 text-[13px] text-ink/60 hover:text-ink hover:border-black/30 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
          title="Få AI-hjelp til å skrive svaret"
        >
          {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          AI-hjelp
        </button>
      </div>
    </div>
  );
}

// ── Action bar shared ─────────────────────────────────────────────────────────

function EmailActions({
  emailId,
  type,
  archived,
  folderId,
  folders,
  onMoved,
  onArchive,
  onDelete,
  extraLeft,
}: {
  emailId: string;
  type: "inbound" | "sent";
  archived: boolean;
  folderId: string | null;
  folders: EmailFolder[];
  onMoved: (folderId: string | null) => void;
  onArchive: () => void;
  onDelete: () => void;
  extraLeft?: React.ReactNode;
}) {
  const [deletingConfirm, setDeletingConfirm] = useState(false);

  async function doArchive() {
    await fetch(`/api/admin/innboks/${emailId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, archived: !archived }),
    });
    onArchive();
  }

  async function doDelete() {
    await fetch(`/api/admin/innboks/${emailId}?type=${type}`, { method: "DELETE" });
    onDelete();
  }

  return (
    <div className="px-6 py-3 border-t border-black/8 shrink-0 flex items-center gap-2 flex-wrap">
      {extraLeft}
      <MoveMenu emailId={emailId} type={type} currentFolderId={folderId} folders={folders} onMoved={onMoved} />
      <button
        onClick={doArchive}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/15 text-[12px] text-ink/60 hover:text-ink hover:border-black/30 transition-colors"
        title={archived ? "Fjern fra arkiv" : "Arkiver"}
      >
        <Archive size={12} /> {archived ? "Fjern arkiv" : "Arkiver"}
      </button>
      {deletingConfirm ? (
        <span className="flex items-center gap-1 text-[12px]">
          <span className="text-ink/50">Sikker?</span>
          <button onClick={doDelete} className="px-2 py-1 rounded text-red-600 hover:bg-red-50 font-medium transition-colors">Slett</button>
          <button onClick={() => setDeletingConfirm(false)} className="px-2 py-1 rounded text-ink/40 hover:text-ink transition-colors">Avbryt</button>
        </span>
      ) : (
        <button
          onClick={() => setDeletingConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/15 text-[12px] text-ink/60 hover:text-red-600 hover:border-red-200 transition-colors"
        >
          <Trash2 size={12} /> Slett
        </button>
      )}
    </div>
  );
}

// ── InboundDetail ─────────────────────────────────────────────────────────────

function InboundDetail({
  email, folders, userName, onReply, replying, onReplySent, onCancelReply,
  onBack, onMoved, onArchive, onDelete,
}: {
  email: InboundEmail | null;
  folders: EmailFolder[];
  userName: string | null;
  onReply: () => void;
  replying: boolean;
  onReplySent: (sent: SentEmail) => void;
  onCancelReply: () => void;
  onBack: () => void;
  onMoved: (id: string, folderId: string | null) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showHtml, setShowHtml] = useState(false);
  useEffect(() => setShowHtml(false), [email?.id]);

  if (!email) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[13px] text-ink/30">Velg en e-post</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 py-4 border-b border-black/8 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-[12px] text-ink/40 hover:text-ink mb-3 md:hidden">
          <ChevronLeft size={14} /> Tilbake
        </button>
        <h2 className="text-[17px] font-semibold leading-tight mb-3">{email.subject}</h2>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-black/8 flex items-center justify-center text-[11px] font-semibold shrink-0">
                {(email.fromName ?? email.fromAddress).slice(0, 1).toUpperCase()}
              </div>
              <div>
                <span className="text-[13px] font-medium">{email.fromName ?? email.fromAddress}</span>
                {email.fromName && <span className="text-[12px] text-ink/50 ml-1.5">&lt;{email.fromAddress}&gt;</span>}
              </div>
            </div>
            <p className="text-[12px] text-ink/40 pl-9">til {email.toAddress}</p>
          </div>
          <span className="text-[12px] text-ink/40 shrink-0">{fmtFull(email.receivedAt)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
        {email.htmlBody && (
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setShowHtml(false)} className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${!showHtml ? "bg-ink text-bg" : "text-ink/50 hover:text-ink"}`}>Tekst</button>
            <button onClick={() => setShowHtml(true)} className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${showHtml ? "bg-ink text-bg" : "text-ink/50 hover:text-ink"}`}>HTML</button>
          </div>
        )}
        {showHtml && email.htmlBody
          ? <iframe srcDoc={email.htmlBody} className="w-full min-h-[400px] border-0 rounded-lg bg-white" sandbox="allow-same-origin" title="E-post" />
          : <pre className="text-[14px] whitespace-pre-wrap font-sans text-ink/85 leading-relaxed">{email.textBody ?? "(ingen tekstinnhold)"}</pre>
        }
      </div>

      {replying ? (
        <div className="border-t border-black/8 h-[360px] shrink-0 flex flex-col">
          <ComposeForm
            userName={userName}
            defaultTo={email.fromAddress}
            defaultSubject={email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`}
            inReplyTo={email.messageId ?? undefined}
            threadText={email.textBody ?? undefined}
            onSent={(s) => { onReplySent(s); }}
            onClose={onCancelReply}
          />
        </div>
      ) : (
        <EmailActions
          emailId={email.id}
          type="inbound"
          archived={email.archived}
          folderId={email.folderId}
          folders={folders}
          onMoved={(fId) => onMoved(email.id, fId)}
          onArchive={() => onArchive(email.id)}
          onDelete={() => onDelete(email.id)}
          extraLeft={
            <button onClick={onReply} className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-black/15 text-[13px] text-ink/60 hover:text-ink hover:border-black/30 transition-colors">
              <Reply size={13} /> Svar
            </button>
          }
        />
      )}
    </div>
  );
}

// ── SentDetail ────────────────────────────────────────────────────────────────

function SentDetail({
  email, folders, onBack, onMoved, onArchive, onDelete,
}: {
  email: SentEmail | null;
  folders: EmailFolder[];
  onBack: () => void;
  onMoved: (id: string, folderId: string | null) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showHtml, setShowHtml] = useState(false);
  useEffect(() => setShowHtml(false), [email?.id]);

  if (!email) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[13px] text-ink/30">Velg en e-post</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 py-4 border-b border-black/8 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-[12px] text-ink/40 hover:text-ink mb-3 md:hidden">
          <ChevronLeft size={14} /> Tilbake
        </button>
        <h2 className="text-[17px] font-semibold leading-tight mb-3">{email.subject}</h2>
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-ink/60">til {email.toAddress}</p>
          <span className="text-[12px] text-ink/40 shrink-0">{fmtFull(email.sentAt)}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
        {email.htmlBody && (
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setShowHtml(false)} className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${!showHtml ? "bg-ink text-bg" : "text-ink/50 hover:text-ink"}`}>Tekst</button>
            <button onClick={() => setShowHtml(true)} className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${showHtml ? "bg-ink text-bg" : "text-ink/50 hover:text-ink"}`}>HTML</button>
          </div>
        )}
        {showHtml && email.htmlBody
          ? <iframe srcDoc={email.htmlBody} className="w-full min-h-[400px] border-0 rounded-lg bg-white" sandbox="allow-same-origin" title="E-post" />
          : <pre className="text-[14px] whitespace-pre-wrap font-sans text-ink/85 leading-relaxed">{email.textBody ?? ""}</pre>
        }
      </div>
      <EmailActions
        emailId={email.id}
        type="sent"
        archived={email.archived}
        folderId={email.folderId}
        folders={folders}
        onMoved={(fId) => onMoved(email.id, fId)}
        onArchive={() => onArchive(email.id)}
        onDelete={() => onDelete(email.id)}
      />
    </div>
  );
}

// ── Mixed folder view ─────────────────────────────────────────────────────────

type AnyEmail = {
  id: string; kind: "inbound" | "sent";
  from: string; subject: string; date: string; folderId: string | null;
};

function FolderDetail({
  folderId, inbox, sent, folders, userName, selectedId,
  onSelect, onInboundMoved, onSentMoved,
  onInboundArchive, onSentArchive, onInboundDelete, onSentDelete,
}: {
  folderId: string;
  inbox: InboundEmail[];
  sent: SentEmail[];
  folders: EmailFolder[];
  userName: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onInboundMoved: (id: string, folderId: string | null) => void;
  onSentMoved: (id: string, folderId: string | null) => void;
  onInboundArchive: (id: string) => void;
  onSentArchive: (id: string) => void;
  onInboundDelete: (id: string) => void;
  onSentDelete: (id: string) => void;
}) {
  const [replying, setReplying] = useState(false);
  const items: AnyEmail[] = [
    ...inbox.filter((e) => e.folderId === folderId).map((e) => ({
      id: e.id, kind: "inbound" as const,
      from: e.fromName ?? e.fromAddress,
      subject: e.subject, date: e.receivedAt, folderId: e.folderId,
    })),
    ...sent.filter((e) => e.folderId === folderId).map((e) => ({
      id: e.id, kind: "sent" as const,
      from: `→ ${e.toAddress}`,
      subject: e.subject, date: e.sentAt, folderId: e.folderId,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const selectedInbound = inbox.find((e) => e.id === selectedId) ?? null;
  const selectedSent = sent.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
      <div className="w-[300px] shrink-0 border-r border-black/8 flex flex-col overflow-hidden">
        <div className="px-4 py-3.5 border-b border-black/8">
          <h2 className="text-[13px] font-semibold">Mappe</h2>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-black/5">
          {items.length === 0 && <p className="px-4 py-8 text-[12px] text-ink/40 text-center">Tom mappe</p>}
          {items.map((e) => (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              className={`w-full text-left px-4 py-3.5 hover:bg-black/[0.02] transition-colors ${selectedId === e.id ? "bg-black/5" : ""}`}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[13px] font-medium truncate">{e.from}</span>
                <span className="text-[11px] text-ink/40 shrink-0">{fmtDate(e.date)}</span>
              </div>
              <p className="text-[12px] text-ink/70 truncate">{e.subject}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col bg-bg overflow-hidden">
        {selectedInbound ? (
          <InboundDetail
            email={selectedInbound} folders={folders} userName={userName}
            onReply={() => setReplying(true)} replying={replying}
            onReplySent={() => setReplying(false)} onCancelReply={() => setReplying(false)}
            onBack={() => onSelect("")}
            onMoved={onInboundMoved} onArchive={onInboundArchive} onDelete={onInboundDelete}
          />
        ) : selectedSent ? (
          <SentDetail
            email={selectedSent} folders={folders}
            onBack={() => onSelect("")}
            onMoved={onSentMoved} onArchive={onSentArchive} onDelete={onSentDelete}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[13px] text-ink/30">Velg en e-post</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main shell ────────────────────────────────────────────────────────────────

export function InnboksClient({
  userName,
  inbox: initialInbox,
  sent: initialSent,
  folders: initialFolders,
}: {
  userName: string | null;
  inbox: InboundEmail[];
  sent: SentEmail[];
  folders: EmailFolder[];
}) {
  const router = useRouter();
  const [inbox, setInbox] = useState(initialInbox);
  const [sent, setSent] = useState(initialSent);
  const [folders, setFolders] = useState(initialFolders);
  const [view, setView] = useState<FolderView>("inbox");
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null);
  const [selectedSentId, setSelectedSentId] = useState<string | null>(null);
  const [selectedArchivedId, setSelectedArchivedId] = useState<string | null>(null);
  const [selectedFolderItemId, setSelectedFolderItemId] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [composing, setComposing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [importing, setImporting] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const newFolderRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (creatingFolder) newFolderRef.current?.focus(); }, [creatingFolder]);

  const inboxUnfoldered = inbox.filter((e) => !e.folderId && !e.archived);
  const sentUnfoldered = sent.filter((e) => !e.folderId && !e.archived);
  const archivedInbox = inbox.filter((e) => e.archived);
  const archivedSent = sent.filter((e) => e.archived);

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/admin/import-inbound", { method: "POST" });
      const data = await res.json();
      if (data.imported > 0) router.refresh();
    } finally {
      setImporting(false);
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) { setCreatingFolder(false); return; }
    const res = await fetch("/api/admin/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim(), parentId: newFolderParentId }),
    });
    const data = await res.json();
    if (res.ok) {
      setFolders((f) => [...f, data.folder]);
      setView(data.folder.id);
    }
    setNewFolderName(""); setCreatingFolder(false); setNewFolderParentId(null);
  }

  async function renameFolder(id: string) {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    const res = await fetch(`/api/admin/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    if (res.ok) setFolders((f) => f.map((x) => x.id === id ? { ...x, name: renameValue.trim() } : x));
    setRenamingId(null);
  }

  async function deleteFolder(id: string) {
    await fetch(`/api/admin/folders/${id}`, { method: "DELETE" });
    setFolders((f) => f.filter((x) => x.id !== id));
    setInbox((e) => e.map((x) => x.folderId === id ? { ...x, folderId: null } : x));
    setSent((e) => e.map((x) => x.folderId === id ? { ...x, folderId: null } : x));
    if (view === id) setView("inbox");
  }

  function handleInboxMoved(id: string, folderId: string | null) {
    setInbox((e) => e.map((x) => x.id === id ? { ...x, folderId } : x));
    setSelectedInboxId(null);
  }
  function handleSentMoved(id: string, folderId: string | null) {
    setSent((e) => e.map((x) => x.id === id ? { ...x, folderId } : x));
    setSelectedSentId(null);
  }
  function handleInboxArchive(id: string) {
    setInbox((e) => e.map((x) => x.id === id ? { ...x, archived: !x.archived } : x));
    setSelectedInboxId(null);
  }
  function handleSentArchive(id: string) {
    setSent((e) => e.map((x) => x.id === id ? { ...x, archived: !x.archived } : x));
    setSelectedSentId(null);
  }
  function handleInboxDelete(id: string) {
    setInbox((e) => e.filter((x) => x.id !== id));
    setSelectedInboxId(null);
  }
  function handleSentDelete(id: string) {
    setSent((e) => e.filter((x) => x.id !== id));
    setSelectedSentId(null);
  }
  function handleArchivedDelete(id: string) {
    setInbox((e) => e.filter((x) => x.id !== id));
    setSent((e) => e.filter((x) => x.id !== id));
    setSelectedArchivedId(null);
  }

  const selectedInbox = inbox.find((e) => e.id === selectedInboxId) ?? null;
  const selectedSent = sent.find((e) => e.id === selectedSentId) ?? null;
  const selectedArchivedInbound = archivedInbox.find((e) => e.id === selectedArchivedId) ?? null;
  const selectedArchivedSent = archivedSent.find((e) => e.id === selectedArchivedId) ?? null;

  const navBtn = (active: boolean) =>
    `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${active ? "bg-black/8 text-ink font-medium" : "text-ink/60 hover:text-ink hover:bg-black/5"}`;

  // Build folder tree for sidebar
  const rootFolders = folders.filter((f) => !f.parentId);
  const childFolders = (parentId: string) => folders.filter((f) => f.parentId === parentId);
  const hasChildren = (id: string) => folders.some((f) => f.parentId === id);

  function toggleExpand(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function renderFolderItem(f: EmailFolder, depth = 0): React.ReactNode {
    const isActive = view === f.id;
    const expanded = expandedFolders.has(f.id);
    const kids = childFolders(f.id);

    return (
      <div key={f.id}>
        <div className="group relative flex items-center">
          {renamingId === f.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => renameFolder(f.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") renameFolder(f.id);
                if (e.key === "Escape") setRenamingId(null);
              }}
              className="w-full px-3 py-2 text-[13px] bg-black/5 rounded-lg outline-none"
              style={{ paddingLeft: `${12 + depth * 14}px` }}
            />
          ) : (
            <button
              onClick={() => { setView(f.id); setComposing(false); }}
              className={navBtn(isActive)}
              style={{ paddingLeft: `${12 + depth * 14}px` }}
            >
              {kids.length > 0 ? (
                <span
                  onClick={(e) => { e.stopPropagation(); toggleExpand(f.id); }}
                  className="shrink-0"
                >
                  <ChevronRight size={12} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
                </span>
              ) : (
                <FolderOpen size={14} className="shrink-0" />
              )}
              <span className="truncate flex-1 text-left">{f.name}</span>
              <span
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setCreatingFolder(true); setNewFolderParentId(f.id); }}
                  className="p-0.5 rounded hover:bg-black/10 text-ink/40 hover:text-ink"
                  title="Legg til undermappe"
                >
                  <FolderPlus size={10} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setRenamingId(f.id); setRenameValue(f.name); }}
                  className="p-0.5 rounded hover:bg-black/10 text-ink/40 hover:text-ink"
                  title="Gi nytt navn"
                >
                  <MoreHorizontal size={11} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFolder(f.id); }}
                  className="p-0.5 rounded hover:bg-red-50 text-ink/40 hover:text-red-600"
                  title="Slett mappe"
                >
                  <Trash2 size={11} />
                </button>
              </span>
            </button>
          )}
        </div>
        {expanded && kids.map((child) => renderFolderItem(child, depth + 1))}
      </div>
    );
  }

  const archivedCount = archivedInbox.length + archivedSent.length;

  return (
    <div className="fixed inset-0 left-[220px] flex overflow-hidden bg-bg z-10">
      {/* ── Sidebar ── */}
      <aside className="w-[200px] shrink-0 border-r border-black/8 flex flex-col bg-bg">
        <div className="p-3 pt-5">
          <button
            onClick={() => { setComposing(true); setShowDetail(true); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-ink text-bg text-[13px] font-medium hover:opacity-85 transition-opacity"
          >
            <PenSquare size={14} /> Ny e-post
          </button>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          <button onClick={() => { setView("inbox"); setComposing(false); }} className={navBtn(view === "inbox")}>
            <Inbox size={14} className="shrink-0" />
            Innboks
            {inboxUnfoldered.length > 0 && (
              <span className="ml-auto w-5 h-5 flex items-center justify-center rounded-full bg-accent text-white text-[10px] font-semibold shrink-0">
                {inboxUnfoldered.length > 99 ? "99+" : inboxUnfoldered.length}
              </span>
            )}
          </button>
          <button onClick={() => { setView("sent"); setComposing(false); }} className={navBtn(view === "sent")}>
            <Send size={14} className="shrink-0" /> Sendt
          </button>
          <button onClick={() => { setView("archived"); setComposing(false); }} className={navBtn(view === "archived")}>
            <Archive size={14} className="shrink-0" />
            Arkivert
            {archivedCount > 0 && (
              <span className="ml-auto text-[11px] text-ink/40 shrink-0">{archivedCount}</span>
            )}
          </button>

          {(folders.length > 0 || creatingFolder) && (
            <div className="pt-3 pb-1">
              <p className="px-3 text-[10px] uppercase tracking-wider text-ink/30 font-medium mb-1">Mapper</p>
            </div>
          )}

          {rootFolders.map((f) => renderFolderItem(f, 0))}

          {creatingFolder ? (
            <input
              ref={newFolderRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={createFolder}
              onKeyDown={(e) => {
                if (e.key === "Enter") createFolder();
                if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); setNewFolderParentId(null); }
              }}
              placeholder={newFolderParentId ? "Undermappens navn…" : "Mappenavn…"}
              className="w-full px-3 py-2 text-[13px] bg-black/5 rounded-lg outline-none placeholder:text-ink/30"
            />
          ) : (
            <button
              onClick={() => { setCreatingFolder(true); setNewFolderParentId(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-ink/40 hover:text-ink hover:bg-black/5 transition-colors"
            >
              <FolderPlus size={13} /> Ny mappe
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-black/6">
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-ink/40 hover:text-ink hover:bg-black/5 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={importing ? "animate-spin" : ""} />
            Synk Resend
          </button>
        </div>
      </aside>

      {/* ── Content area ── */}
      {view !== "inbox" && view !== "sent" && view !== "archived" ? (
        <FolderDetail
          folderId={view}
          inbox={inbox}
          sent={sent}
          folders={folders}
          userName={userName}
          selectedId={selectedFolderItemId}
          onSelect={(id) => setSelectedFolderItemId(id || null)}
          onInboundMoved={handleInboxMoved}
          onSentMoved={handleSentMoved}
          onInboundArchive={handleInboxArchive}
          onSentArchive={handleSentArchive}
          onInboundDelete={handleInboxDelete}
          onSentDelete={handleSentDelete}
        />
      ) : view === "archived" ? (
        /* ── Archived view ── */
        <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
          <div className="w-[300px] shrink-0 border-r border-black/8 flex flex-col overflow-hidden">
            <div className="px-4 py-3.5 border-b border-black/8">
              <h2 className="text-[13px] font-semibold">Arkivert</h2>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-black/5">
              {archivedCount === 0 && <p className="px-4 py-8 text-[12px] text-ink/40 text-center">Ingenting arkivert</p>}
              {[
                ...archivedInbox.map((e) => ({ id: e.id, kind: "inbound" as const, from: e.fromName ?? e.fromAddress, subject: e.subject, date: e.receivedAt })),
                ...archivedSent.map((e) => ({ id: e.id, kind: "sent" as const, from: `→ ${e.toAddress}`, subject: e.subject, date: e.sentAt })),
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { setSelectedArchivedId(e.id); setShowDetail(true); }}
                    className={`w-full text-left px-4 py-3.5 hover:bg-black/[0.02] transition-colors ${selectedArchivedId === e.id ? "bg-black/5" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[13px] font-medium truncate opacity-60">{e.from}</span>
                      <span className="text-[11px] text-ink/40 shrink-0">{fmtDate(e.date)}</span>
                    </div>
                    <p className="text-[12px] text-ink/50 truncate">{e.subject}</p>
                  </button>
                ))}
            </div>
          </div>
          <div className="flex-1 min-w-0 flex flex-col bg-bg overflow-hidden">
            {selectedArchivedInbound ? (
              <InboundDetail
                email={selectedArchivedInbound} folders={folders} userName={userName}
                onReply={() => {}} replying={false}
                onReplySent={() => {}} onCancelReply={() => {}}
                onBack={() => setSelectedArchivedId(null)}
                onMoved={handleInboxMoved}
                onArchive={handleArchivedDelete}
                onDelete={handleArchivedDelete}
              />
            ) : selectedArchivedSent ? (
              <SentDetail
                email={selectedArchivedSent} folders={folders}
                onBack={() => setSelectedArchivedId(null)}
                onMoved={handleSentMoved}
                onArchive={handleArchivedDelete}
                onDelete={handleArchivedDelete}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[13px] text-ink/30">Velg en e-post</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ── Email list ── */}
          <div className={`w-[300px] shrink-0 border-r border-black/8 flex flex-col bg-bg overflow-hidden ${showDetail ? "hidden md:flex" : "flex"}`}>
            <div className="px-4 py-3.5 border-b border-black/8">
              <h2 className="text-[13px] font-semibold">{view === "inbox" ? "Innboks" : "Sendt"}</h2>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-black/5">
              {view === "inbox" && (
                <>
                  {inboxUnfoldered.length === 0 && <p className="px-4 py-8 text-[12px] text-ink/40 text-center">Ingen e-poster</p>}
                  {inboxUnfoldered.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => { setSelectedInboxId(e.id); setReplying(false); setComposing(false); setShowDetail(true); }}
                      className={`w-full text-left px-4 py-3.5 hover:bg-black/[0.02] transition-colors ${selectedInboxId === e.id ? "bg-black/5" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[13px] font-medium truncate">{e.fromName ?? e.fromAddress}</span>
                        <span className="text-[11px] text-ink/40 shrink-0">{fmtDate(e.receivedAt)}</span>
                      </div>
                      <p className="text-[12px] text-ink/70 truncate">{e.subject}</p>
                      {e.textBody && <p className="text-[11px] text-ink/35 truncate mt-0.5">{e.textBody.slice(0, 80)}</p>}
                    </button>
                  ))}
                </>
              )}
              {view === "sent" && (
                <>
                  {sentUnfoldered.length === 0 && <p className="px-4 py-8 text-[12px] text-ink/40 text-center">Ingen sendte e-poster</p>}
                  {sentUnfoldered.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => { setSelectedSentId(e.id); setComposing(false); setShowDetail(true); }}
                      className={`w-full text-left px-4 py-3.5 hover:bg-black/[0.02] transition-colors ${selectedSentId === e.id ? "bg-black/5" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[13px] font-medium truncate">{e.toAddress}</span>
                        <span className="text-[11px] text-ink/40 shrink-0">{fmtDate(e.sentAt)}</span>
                      </div>
                      <p className="text-[12px] text-ink/70 truncate">{e.subject}</p>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* ── Detail pane ── */}
          <div className={`flex-1 min-w-0 flex flex-col bg-bg overflow-hidden ${showDetail ? "flex" : "hidden md:flex"}`}>
            {composing ? (
              <ComposeForm
                userName={userName}
                onSent={(s) => {
                  setSent((prev) => [s, ...prev]);
                  setComposing(false);
                  setView("sent");
                  setSelectedSentId(s.id);
                  setShowDetail(true);
                }}
                onClose={() => { setComposing(false); setShowDetail(false); }}
              />
            ) : view === "inbox" ? (
              <InboundDetail
                email={selectedInbox}
                folders={folders}
                userName={userName}
                onReply={() => setReplying(true)}
                replying={replying}
                onReplySent={(s) => {
                  setSent((prev) => [s, ...prev]);
                  setReplying(false);
                  setView("sent");
                  setSelectedSentId(s.id);
                }}
                onCancelReply={() => setReplying(false)}
                onBack={() => setShowDetail(false)}
                onMoved={handleInboxMoved}
                onArchive={handleInboxArchive}
                onDelete={handleInboxDelete}
              />
            ) : (
              <SentDetail
                email={selectedSent}
                folders={folders}
                onBack={() => setShowDetail(false)}
                onMoved={handleSentMoved}
                onArchive={handleSentArchive}
                onDelete={handleSentDelete}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
