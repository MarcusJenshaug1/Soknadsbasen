import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionLabel } from "@/components/ui/Pill";
import { StatusDot, type StatusKey } from "@/components/ui/StatusDot";
import { PrefetchLink } from "@/components/ui/PrefetchLink";
import { NewLetterButton, type LetterPickerApp } from "./NewLetterButton";

export const dynamic = "force-dynamic";

export default async function BrevPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/logg-inn");

  const apps = await prisma.jobApplication.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      companyName: true,
      title: true,
      status: true,
      // Kun eksistens + dato brukes i lista — body er en tung HTML-blob vi
      // aldri rendrer her, så den hentes ikke (spar baudbredde per søknad).
      coverLetter: { select: { id: true, updatedAt: true } },
    },
  });

  const withLetters = apps.filter((a) => a.coverLetter);
  const withoutLetters = apps.filter((a) => !a.coverLetter);

  const pickerApps: LetterPickerApp[] = apps.map((a) => ({
    id: a.id,
    title: a.title,
    companyName: a.companyName,
    hasLetter: Boolean(a.coverLetter),
  }));

  return (
    <div className="max-w-[1000px] mx-auto px-5 md:px-10 py-6 md:py-10">
      <SectionLabel className="mb-3">Søknadsbrev</SectionLabel>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium">
          Brevene dine
        </h1>
        <div className="shrink-0">
          <NewLetterButton apps={pickerApps} />
        </div>
      </div>
      <p className="text-[14px] text-[#14110e]/60 dark:text-[#f0ece6]/60 mb-10">
        Ett brev per søknad. Auto-lagres mens du skriver.
      </p>

      {apps.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-[#14110e]/60 dark:text-[#f0ece6]/60 max-w-sm mx-auto mb-6">
            Opprett en søknad først — brevet kobles til stillingen.
          </p>
          <Link
            href="/app/pipeline"
            className="inline-flex px-5 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830]"
          >
            Åpne pipeline
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {withLetters.length > 0 && (
            <section>
              <SectionLabel className="mb-3">Skrevet</SectionLabel>
              <ul className="bg-surface rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                {withLetters.map((a) => (
                  <LetterRow
                    key={a.id}
                    app={a}
                    hasLetter
                  />
                ))}
              </ul>
            </section>
          )}

          {withoutLetters.length > 0 && (
            <section>
              <SectionLabel className="mb-3">Mangler brev</SectionLabel>
              <ul className="bg-surface rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                {withoutLetters.map((a) => (
                  <LetterRow key={a.id} app={a} hasLetter={false} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function LetterRow({
  app,
  hasLetter,
}: {
  app: {
    id: string;
    companyName: string;
    title: string;
    status: string;
    coverLetter: { id: string; updatedAt: Date } | null;
  };
  hasLetter: boolean;
}) {
  const updated = app.coverLetter?.updatedAt;
  return (
    <li>
      <PrefetchLink
        href={`/app/brev/${app.id}`}
        className="flex items-center justify-between gap-4 p-4 hover:bg-panel/40 transition-colors"
      >
        <div className="min-w-0">
          <div className="text-[14px] font-medium leading-tight">
            {app.title}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55">
            <span>{app.companyName}</span>
            <StatusDot status={app.status as StatusKey} />
            {hasLetter && updated && (
              <span>
                Oppdatert{" "}
                {new Date(updated).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-[12px] text-accent">
          {hasLetter ? "Åpne →" : "Skriv →"}
        </span>
      </PrefetchLink>
    </li>
  );
}
