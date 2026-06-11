import { FACET_GROUP_LABELS } from "./facet-config";
import { fylkeBySlug } from "./geo";
import type { RegisterIndex } from "./registers";
import {
  EMPTY_PARAMS,
  buildJobbUrl,
  type JobbParams,
} from "./search-params";

/**
 * SEO-beslutning for /jobb-filterkombinasjoner. Indekserbart er KUN de
 * kuraterte landingssidene: tom, {ett fylke}, {én kategori}, {fylke+kategori}
 * — uten q, side 1, default sortering. Alt annet: noindex,follow med kanonisk
 * mot nærmeste indekserte side (kommune → sitt fylke, øvrige grupper droppes).
 * Ren funksjon — unit-testbar.
 */

export type JobbSeoDecision =
  | { mode: "index"; canonicalPath: string; title: string; description: string }
  | { mode: "noindex-follow"; canonicalPath: string };

export function jobbSeoDecision(
  params: JobbParams,
  index: RegisterIndex,
  totalCount: number,
): JobbSeoDecision {
  const curated = toCuratedParams(params, index);
  const canonicalPath = buildJobbUrl(curated);

  const isCuratedAsIs =
    !params.q &&
    params.side === 1 &&
    params.sortering === null &&
    buildJobbUrl(params) === canonicalPath;

  if (!isCuratedAsIs) return { mode: "noindex-follow", canonicalPath };

  const fylke = params.fylke[0] ? fylkeBySlug(params.fylke[0]) : undefined;
  const kategori = params.kategori[0]
    ? index.kategori.get(params.kategori[0])
    : undefined;
  const n = totalCount.toLocaleString("nb-NO");

  if (fylke && kategori) {
    return {
      mode: "index",
      canonicalPath,
      title: `Ledige stillinger innen ${kategori.label.toLocaleLowerCase("nb-NO")} i ${fylke.label}`,
      description: `${n} ledige stillinger innen ${kategori.label.toLocaleLowerCase("nb-NO")} i ${fylke.label} akkurat nå. Sjekk frister, og se hvilke stillinger som matcher CV-en din.`,
    };
  }
  if (fylke) {
    return {
      mode: "index",
      canonicalPath,
      title: `Ledige stillinger i ${fylke.label}`,
      description: `Se ${n} ledige stillinger i ${fylke.label} fra hele arbeidsmarkedet. Filtrer på yrke, omfang og frist, og se hvor godt CV-en din matcher kravene.`,
    };
  }
  if (kategori) {
    return {
      mode: "index",
      canonicalPath,
      title: `Ledige stillinger innen ${kategori.label.toLocaleLowerCase("nb-NO")}`,
      description: `Se ${n} ledige stillinger innen ${kategori.label.toLocaleLowerCase("nb-NO")} i hele Norge. Oppdatert hver time, med match mot CV-en din.`,
    };
  }
  return {
    mode: "index",
    canonicalPath,
    title: "Ledige stillinger i hele Norge",
    description: `Søk blant ${n} ledige stillinger fra hele landet. Filtrer på sted, yrke, omfang og mer, og se hvilke stillinger som matcher CV-en din.`,
  };
}

/**
 * Nærmeste kuraterte kombinasjon: kommune løftes til sitt fylke, alle andre
 * grupper droppes, multi-verdier reduseres (flere fylker/kategorier → dropp
 * gruppen). Resultatet er per konstruksjon en av de fire kuraterte formene.
 */
function toCuratedParams(params: JobbParams, index: RegisterIndex): JobbParams {
  let fylke = params.fylke.length === 1 ? params.fylke : [];
  if (fylke.length === 0 && params.kommune.length >= 1) {
    const fylkeSlugs = [
      ...new Set(
        params.kommune
          .map((k) => index.kommune.get(k)?.fylkeSlug)
          .filter((s): s is string => Boolean(s)),
      ),
    ];
    if (fylkeSlugs.length === 1) fylke = fylkeSlugs;
  }
  const kategori = params.kategori.length === 1 ? params.kategori : [];
  return { ...EMPTY_PARAMS, fylke, kategori };
}

/** Lesbar etikett for ett aktivt valg — chips-raden og «fjern siste filter». */
export function paramValueLabel(
  key: keyof typeof FACET_GROUP_LABELS | "q",
  slug: string,
  index: RegisterIndex,
): string {
  if (key === "q") return `«${slug}»`;
  if (key === "fylke") return fylkeBySlug(slug)?.label ?? slug;
  if (key === "kommune") return index.kommune.get(slug)?.label ?? slug;
  if (key === "kategori") return index.kategori.get(slug)?.label ?? slug;
  return slug;
}
