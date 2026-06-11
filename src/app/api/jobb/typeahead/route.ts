import { NextRequest, NextResponse } from "next/server";

import { FYLKER } from "@/lib/jobs/geo";
import { getKategoriRegister, getKommuneRegister } from "@/lib/jobs/registers";

export const runtime = "nodejs";

export type TypeaheadEntry = {
  kind: "fylke" | "kommune" | "kategori";
  slug: string;
  label: string;
};

export type TypeaheadResponse = {
  steder: TypeaheadEntry[];
  yrker: TypeaheadEntry[];
};

/**
 * GET /api/jobb/typeahead?q= — forslag for det kombinerte søkefeltet,
 * gruppert Sted/Yrke. Registrene er allerede cachet server-side (1 t);
 * responsen CDN-caches per q. Valg legges til som filter klient-side
 * (toggleParam + buildJobbUrl) — aldri fetching av selve listen her.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLocaleLowerCase("nb-NO");
  if (q.length < 2) {
    return NextResponse.json<TypeaheadResponse>({ steder: [], yrker: [] });
  }

  const [kommuner, kategorier] = await Promise.all([
    getKommuneRegister(),
    getKategoriRegister(),
  ]);

  const steder: TypeaheadEntry[] = [
    ...FYLKER.filter((f) => f.label.toLocaleLowerCase("nb-NO").startsWith(q))
      .slice(0, 2)
      .map((f) => ({ kind: "fylke" as const, slug: f.slug, label: f.label })),
    ...kommuner
      .filter((k) => k.label.toLocaleLowerCase("nb-NO").startsWith(q))
      .slice(0, 4)
      .map((k) => ({ kind: "kommune" as const, slug: k.slug, label: k.label })),
  ].slice(0, 5);

  const yrker: TypeaheadEntry[] = kategorier
    .filter((k) => k.label.toLocaleLowerCase("nb-NO").includes(q))
    .slice(0, 5)
    .map((k) => ({ kind: "kategori" as const, slug: k.slug, label: k.label }));

  return NextResponse.json<TypeaheadResponse>(
    { steder, yrker },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" } },
  );
}
