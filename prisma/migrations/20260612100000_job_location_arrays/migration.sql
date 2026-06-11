-- Multi-lokasjon: regioner[]/kommuner[] (lowercase) fra ALLE workLocations,
-- så annonser med flere arbeidssteder filtreres/telles i alle sine fylker og
-- kommuner. kommune/region-kolonnene forblir primærlokasjon for visning.

ALTER TABLE "Job" ADD COLUMN "regioner" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Job" ADD COLUMN "kommuner" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill fra workLocations-JSON (per-element, lowercase, dedup, uten tomme).
UPDATE "Job" SET
  "regioner" = COALESCE(sub.regioner, ARRAY[]::TEXT[]),
  "kommuner" = COALESCE(sub.kommuner, ARRAY[]::TEXT[])
FROM (
  SELECT id,
    array_agg(DISTINCT lower(trim(el->>'county'))) FILTER (
      WHERE nullif(trim(el->>'county'), '') IS NOT NULL
    ) AS regioner,
    array_agg(DISTINCT lower(trim(COALESCE(nullif(trim(el->>'municipal'), ''), el->>'city')))) FILTER (
      WHERE COALESCE(nullif(trim(el->>'municipal'), ''), nullif(trim(el->>'city'), '')) IS NOT NULL
    ) AS kommuner
  FROM "Job", jsonb_array_elements("workLocations") el
  WHERE "workLocations" IS NOT NULL
  GROUP BY id
) sub
WHERE "Job".id = sub.id;

-- Rader uten workLocations: fall tilbake på primærkolonnene.
UPDATE "Job" SET "regioner" = ARRAY[lower("region")]
WHERE cardinality("regioner") = 0 AND "region" IS NOT NULL;
UPDATE "Job" SET "kommuner" = ARRAY[lower("kommune")]
WHERE cardinality("kommuner") = 0 AND "kommune" IS NOT NULL;

-- Rollback: ALTER TABLE "Job" DROP COLUMN "regioner", DROP COLUMN "kommuner";
-- Avledet av workLocations/region/kommune som beholdes — null datatap.
