/**
 * Slugifisering for stillingsmodulens URL-params. Norske tegn mappes eksplisitt
 * (Trøndelag → trondelag, Møre og Romsdal → more-og-romsdal); øvrige
 * diakritika strippes via NFD. Ren funksjon — unit-testbar uten DOM/DB.
 */
const NB_REPLACEMENTS: Record<string, string> = {
  æ: "ae",
  ø: "o",
  å: "a",
};

export function slugifyNb(input: string): string {
  return input
    .toLocaleLowerCase("nb-NO")
    .replace(/[æøå]/g, (m) => NB_REPLACEMENTS[m] ?? m)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
