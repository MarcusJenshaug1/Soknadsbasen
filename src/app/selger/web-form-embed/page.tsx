import { redirect } from "next/navigation";
import { getSelgerPanelAccess } from "@/lib/auth";
import { EmbedSnippet } from "./EmbedSnippet";

export const dynamic = "force-dynamic";

export default async function WebFormEmbedPage() {
  const access = await getSelgerPanelAccess();
  if (!access) redirect("/logg-inn?redirect=/selger/web-form-embed");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://soknadsbasen.no";

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">Web-skjema embed</h1>
        <p className="text-[13px] text-ink/65 mt-1">
          Lim inn denne snutten på en hvilken som helst kunde-nettside. Innsendinger blir
          automatisk fordelt til en tilgjengelig selger via round-robin.
        </p>
      </header>

      <EmbedSnippet baseUrl={baseUrl} />

      <section className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5 space-y-3">
        <h2 className="text-[14px] font-medium">Live-forhåndsvisning</h2>
        <p className="text-[12px] text-ink/55">
          Fungerende widget under. Innsendinger her oppretter ekte leads i pipelinen.
        </p>
        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-6 flex justify-center">
          <div id="soknadsbasen-form" />
        </div>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`${baseUrl}/api/sales/widget.js`} data-theme="light" />
      </section>

      <section className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5">
        <h2 className="text-[14px] font-medium mb-3">Tips</h2>
        <ul className="text-[12px] text-ink/70 space-y-2 list-disc pl-5">
          <li>
            Endre <code className="font-mono text-[11px] bg-black/[0.05] px-1.5 py-0.5 rounded">data-theme="dark"</code> for mørk variant.
          </li>
          <li>Widget mounter automatisk på <code className="font-mono text-[11px] bg-black/[0.05] px-1.5 py-0.5 rounded">#soknadsbasen-form</code> når DOM er klar.</li>
          <li>Honeypot-felt beskytter mot bot-spam. Gyldige innsendinger blir lead i CRM-et innen sekunder.</li>
          <li>Innsenderne får ingen bekreftelse-e-post automatisk. Selger tar kontakt innen 24 timer.</li>
        </ul>
      </section>
    </div>
  );
}
