-- Backfill av kommune + isSummerJob for eksisterende rader.
-- kommune: workLocations[0].municipal ?? city, normalisert med initcap(lower())
-- (håndterer NAVs «SKIEN»/«Skien»-casing-støy og bindestrekstilfeller som
-- «NORD-FRON» → «Nord-Fron»). sync.ts skriver samme normalisering for nye rader.
-- isSummerJob: engagementType='Sesong' ELLER sommerjobb-nøkkelord i tittel/tekst
-- (samme heuristikk som isSummerJobHeuristic i src/lib/jobs/sync.ts).

UPDATE "Job"
SET "kommune" = initcap(lower(coalesce(
      nullif(trim("workLocations"->0->>'municipal'), ''),
      nullif(trim("workLocations"->0->>'city'), '')
    )))
WHERE "workLocations" IS NOT NULL
  AND coalesce(
      nullif(trim("workLocations"->0->>'municipal'), ''),
      nullif(trim("workLocations"->0->>'city'), '')
    ) IS NOT NULL;

UPDATE "Job"
SET "isSummerJob" = true
WHERE lower(coalesce("engagementType", '')) = 'sesong'
   OR "title" ~* '\m(sommerjobb|sommervikar|sommervikariat|feriejobb|sommerjobber)'
   OR "description" ~* '\m(sommerjobb|sommervikar|sommervikariat|feriejobb)';

-- Rollback: UPDATE "Job" SET "kommune" = NULL, "isSummerJob" = false; —
-- begge felter er avledet av workLocations/engagementType/tekst som beholdes.
