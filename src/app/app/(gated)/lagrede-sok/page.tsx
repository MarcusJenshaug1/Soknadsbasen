import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { SavedSearchList } from "./SavedSearchList";

export const dynamic = "force-dynamic";

export default async function LagredeSokPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/logg-inn");

  const searches = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      query: true,
      emailEnabled: true,
      inAppEnabled: true,
      pushEnabled: true,
      emailFrequency: true,
      createdAt: true,
      _count: { select: { hits: true } },
    },
  });

  return (
    <main className="mx-auto max-w-[820px] px-5 pb-24 md:px-10">
      <header className="pb-6 pt-10">
        <h1 className="text-[28px] font-medium tracking-[-0.02em] text-ink">
          Lagrede søk
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Vi varsler deg når nye stillinger matcher. Velg kanal per søk —
          e-post sendes som daglig oppsummering om du ikke velger umiddelbart.
        </p>
      </header>

      {searches.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-8 py-14 text-center">
          <h2 className="text-[16px] font-medium text-ink">
            Ingen lagrede søk ennå
          </h2>
          <p className="mx-auto mt-1.5 max-w-[400px] text-[13px] leading-relaxed text-ink-soft">
            Filtrer stillingslisten slik du vil ha den, og trykk «Lagre søk».
          </p>
          <Link
            href="/jobb"
            className="mt-5 inline-flex h-[38px] items-center rounded-full bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-accent hover:text-white"
          >
            Til stillingene
          </Link>
        </div>
      ) : (
        <SavedSearchList
          searches={searches.map((s) => ({
            id: s.id,
            name: s.name,
            query: s.query,
            emailEnabled: s.emailEnabled,
            inAppEnabled: s.inAppEnabled,
            pushEnabled: s.pushEnabled,
            emailFrequency: s.emailFrequency,
            createdAt: s.createdAt.toISOString(),
            hitCount: s._count.hits,
          }))}
        />
      )}
    </main>
  );
}
