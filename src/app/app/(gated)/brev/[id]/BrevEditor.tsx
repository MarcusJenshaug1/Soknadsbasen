"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SectionLabel } from "@/components/ui/Pill";
import { AiDraftButton } from "./AiDraftButton";
import { Skeleton } from "@/components/ui/Skeleton";

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
  "w-full bg-bg border border-black/8 dark:border-white/8 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#D5592E]";
const LABEL = "text-[11px] uppercase tracking-wider text-ink/55 block mb-2";

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

  const savedLabel =
    status === "saving"
      ? "Lagrer …"
      : status === "error"
        ? "Kunne ikke lagre"
        : lastSaved
          ? `Lagret for ${Math.max(1, Math.round((Date.now() - lastSaved.getTime()) / 1000))}s siden`
          : "Endringer lagres automatisk";

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-6 md:py-10 space-y-6">
      <div className="flex items-center gap-2 text-[12px] text-ink/55">
        <Link href="/app/brev" className="hover:text-[#D5592E]">
          Brev
        </Link>
        <span>/</span>
        <Link
          href={`/app/pipeline/${application.id}`}
          className="hover:text-[#D5592E] truncate"
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
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-ink/45">{savedLabel}</span>
          <button
            onClick={copyLetter}
            className="px-3 py-1.5 rounded-full bg-[#D5592E] text-bg text-[11px] font-medium hover:bg-[#a94424] transition-colors"
          >
            {copied ? "Kopiert!" : "Kopier brev"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
    </div>
  );
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
      className={`relative rounded-2xl bg-surface border border-[#D5592E] overflow-hidden ${minHeight}`}
    >
      <div className="px-5 py-4 text-[14px] text-ink leading-[1.6] whitespace-pre-wrap">
        {text ? (
          <>
            {text}
            <span className="inline-block w-[2px] h-[0.9em] bg-[#D5592E] ml-[2px] align-[-0.05em] animate-pulse" />
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
