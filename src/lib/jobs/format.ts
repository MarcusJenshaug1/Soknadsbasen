/**
 * NAV pam-stilling-feed leverer mange tekstfelter i UPPERCASE (region,
 * city, county). Denne helperen normaliserer til Title Case for visning.
 *
 * Bevarer eksisterende mixed-case (f.eks. "Skien kommune") uendret
 * for å unngå feilkasing der kilden allerede er korrekt.
 */
export function displayPlace(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Hvis strengen inneholder en lowercase-bokstav, antar vi at kilden er
  // korrekt formattert og lar den være.
  if (/[a-zæøå]/.test(trimmed)) return trimmed;

  return trimmed
    .toLocaleLowerCase("nb-NO")
    .split(/(\s|-|\/)/)
    .map((part) =>
      /^[a-zæøå]/i.test(part)
        ? part.charAt(0).toLocaleUpperCase("nb-NO") + part.slice(1)
        : part,
    )
    .join("");
}

/**
 * NAV-kategorier kommer både med og uten stor forbokstav ("sykepleier" vs
 * "Butikkmedarbeider"). Sikrer konsistent visning ved å sette stor
 * forbokstav på første tegn og la resten være.
 */
export function formatCategory(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return (
    trimmed.charAt(0).toLocaleUpperCase("nb-NO") + trimmed.slice(1)
  );
}

/**
 * Filtrer ut åpenbart ugyldige region/kategori-verdier som har sneket seg
 * inn fra feeden ("?", tomme, single-char støy).
 */
export function isValidFacet(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  if (trimmed === "?" || trimmed === "??") return false;
  return true;
}
