-- v2 av job_facet_counts: fylke/kommune leser nå regioner[]/kommuner[]
-- (ALLE arbeidssteder) i stedet for primærkolonnene — annonser med flere
-- lokasjoner telles i hvert av sine fylker/kommuner og treffes av filter på
-- hvilket som helst av dem. Ellers identisk med v1 (se 20260611193000).

CREATE OR REPLACE FUNCTION job_facet_counts(
  p_q               text        DEFAULT NULL,
  p_fylke           text[]      DEFAULT NULL,
  p_kommune         text[]      DEFAULT NULL,
  p_kategori        text[]      DEFAULT NULL,
  p_publisert_etter timestamp   DEFAULT NULL,
  p_utdanning       text[]      DEFAULT NULL,
  p_erfaring        text[]      DEFAULT NULL,
  p_forerkort       text[]      DEFAULT NULL,
  p_sprak           text[]      DEFAULT NULL,
  p_omfang          text[]      DEFAULT NULL,
  p_sommerjobb      boolean     DEFAULT NULL,
  p_ansettelsesform text[]      DEFAULT NULL,
  p_sektor          text[]      DEFAULT NULL,
  p_hjemmekontor    text[]      DEFAULT NULL
) RETURNS TABLE(facet text, value text, n bigint)
LANGUAGE sql STABLE PARALLEL SAFE AS $$
WITH base AS NOT MATERIALIZED (
  SELECT
    j."regioner",
    j."kommuner",
    lower(j."category")        AS kategori,
    j."publishedAt",
    j."aiEducation",
    j."aiExperience",
    j."aiDriversLicense",
    j."aiWorkLanguages",
    j."aiFacetsAt",
    lower(j."extent")          AS omfang,
    j."isSummerJob",
    lower(j."engagementType")  AS ansettelsesform,
    lower(j."sector")          AS sektor,
    j."aiRemote"               AS hjemmekontor,
    (p_q IS NULL OR j."searchVector" @@ websearch_to_tsquery('norwegian', p_q))         AS f_q,
    (p_fylke IS NULL           OR j."regioner" && p_fylke)                              AS f_fylke,
    (p_kommune IS NULL         OR j."kommuner" && p_kommune)                            AS f_kommune,
    (p_kategori IS NULL        OR lower(j."category") = ANY (p_kategori))               AS f_kategori,
    (p_publisert_etter IS NULL OR j."publishedAt" >= p_publisert_etter)                 AS f_pub,
    (p_utdanning IS NULL       OR j."aiEducation" && p_utdanning)                       AS f_utd,
    (p_erfaring IS NULL        OR j."aiExperience" = ANY (p_erfaring))                  AS f_erf,
    (p_forerkort IS NULL
       OR j."aiDriversLicense" && array_remove(p_forerkort, 'ingen-krav')
       OR ('ingen-krav' = ANY (p_forerkort)
           AND cardinality(j."aiDriversLicense") = 0
           AND j."aiFacetsAt" IS NOT NULL))                                             AS f_kort,
    (p_sprak IS NULL           OR j."aiWorkLanguages" && p_sprak)                       AS f_sprak,
    (p_omfang IS NULL          OR lower(j."extent") = ANY (p_omfang))                   AS f_omf,
    (p_sommerjobb IS NULL      OR j."isSummerJob" = p_sommerjobb)                       AS f_sommer,
    (p_ansettelsesform IS NULL OR lower(j."engagementType") = ANY (p_ansettelsesform))  AS f_ans,
    (p_sektor IS NULL          OR lower(j."sector") = ANY (p_sektor))                   AS f_sekt,
    (p_hjemmekontor IS NULL    OR j."aiRemote" = ANY (p_hjemmekontor))                  AS f_rem
  FROM "Job" j
  WHERE j."isActive"
),
nowu AS (
  SELECT (now() AT TIME ZONE 'utc')::timestamp AS t
)

SELECT 'fylke'::text, u.val, count(*)
  FROM base CROSS JOIN LATERAL unnest("regioner") u(val)
 WHERE f_q AND f_kommune AND f_kategori AND f_pub AND f_utd AND f_erf AND f_kort
   AND f_sprak AND f_omf AND f_sommer AND f_ans AND f_sekt AND f_rem
 GROUP BY 2

UNION ALL
SELECT 'kommune', u.val, count(*)
  FROM base CROSS JOIN LATERAL unnest("kommuner") u(val)
 WHERE f_q AND f_fylke AND f_kategori AND f_pub AND f_utd AND f_erf AND f_kort
   AND f_sprak AND f_omf AND f_sommer AND f_ans AND f_sekt AND f_rem
 GROUP BY 2

UNION ALL
SELECT 'kategori', kategori, count(*) FROM base
 WHERE f_q AND f_fylke AND f_kommune AND f_pub AND f_utd AND f_erf AND f_kort
   AND f_sprak AND f_omf AND f_sommer AND f_ans AND f_sekt AND f_rem
   AND kategori IS NOT NULL
 GROUP BY 2

UNION ALL
SELECT 'publisert', v.value, v.n FROM (
  SELECT
    count(*) FILTER (WHERE b."publishedAt" >= nowu.t - interval '1 day')   AS d1,
    count(*) FILTER (WHERE b."publishedAt" >= nowu.t - interval '3 days')  AS d3,
    count(*) FILTER (WHERE b."publishedAt" >= nowu.t - interval '7 days')  AS d7,
    count(*) FILTER (WHERE b."publishedAt" >= nowu.t - interval '14 days') AS d14
  FROM base b CROSS JOIN nowu
  WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_utd AND f_erf AND f_kort
    AND f_sprak AND f_omf AND f_sommer AND f_ans AND f_sekt AND f_rem
) s CROSS JOIN LATERAL (
  VALUES ('24t', s.d1), ('3d', s.d3), ('7d', s.d7), ('14d', s.d14)
) v(value, n)

UNION ALL
SELECT 'utdanning', u.val, count(*)
  FROM base CROSS JOIN LATERAL unnest("aiEducation") u(val)
 WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_pub AND f_erf AND f_kort
   AND f_sprak AND f_omf AND f_sommer AND f_ans AND f_sekt AND f_rem
 GROUP BY 2

UNION ALL
SELECT 'erfaring', "aiExperience", count(*) FROM base
 WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_pub AND f_utd AND f_kort
   AND f_sprak AND f_omf AND f_sommer AND f_ans AND f_sekt AND f_rem
   AND "aiExperience" IS NOT NULL
 GROUP BY 2

UNION ALL
SELECT 'forerkort', u.val, count(*)
  FROM base CROSS JOIN LATERAL unnest("aiDriversLicense") u(val)
 WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_pub AND f_utd AND f_erf
   AND f_sprak AND f_omf AND f_sommer AND f_ans AND f_sekt AND f_rem
 GROUP BY 2

UNION ALL
SELECT 'forerkort', 'ingen-krav', count(*) FROM base
 WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_pub AND f_utd AND f_erf
   AND f_sprak AND f_omf AND f_sommer AND f_ans AND f_sekt AND f_rem
   AND cardinality("aiDriversLicense") = 0 AND "aiFacetsAt" IS NOT NULL

UNION ALL
SELECT 'sprak', u.val, count(*)
  FROM base CROSS JOIN LATERAL unnest("aiWorkLanguages") u(val)
 WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_pub AND f_utd AND f_erf
   AND f_kort AND f_omf AND f_sommer AND f_ans AND f_sekt AND f_rem
 GROUP BY 2

UNION ALL
SELECT 'omfang', omfang, count(*) FROM base
 WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_pub AND f_utd AND f_erf
   AND f_kort AND f_sprak AND f_sommer AND f_ans AND f_sekt AND f_rem
   AND omfang IS NOT NULL
 GROUP BY 2

UNION ALL
SELECT 'sommerjobb', CASE WHEN "isSummerJob" THEN 'ja' ELSE 'nei' END, count(*) FROM base
 WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_pub AND f_utd AND f_erf
   AND f_kort AND f_sprak AND f_omf AND f_ans AND f_sekt AND f_rem
 GROUP BY 2

UNION ALL
SELECT 'ansettelsesform', ansettelsesform, count(*) FROM base
 WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_pub AND f_utd AND f_erf
   AND f_kort AND f_sprak AND f_omf AND f_sommer AND f_sekt AND f_rem
   AND ansettelsesform IS NOT NULL
 GROUP BY 2

UNION ALL
SELECT 'sektor', sektor, count(*) FROM base
 WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_pub AND f_utd AND f_erf
   AND f_kort AND f_sprak AND f_omf AND f_sommer AND f_ans AND f_rem
   AND sektor IS NOT NULL
 GROUP BY 2

UNION ALL
SELECT 'hjemmekontor', hjemmekontor, count(*) FROM base
 WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_pub AND f_utd AND f_erf
   AND f_kort AND f_sprak AND f_omf AND f_sommer AND f_ans AND f_sekt
   AND hjemmekontor IS NOT NULL
 GROUP BY 2

UNION ALL
SELECT 'total', 'alle', count(*) FROM base
 WHERE f_q AND f_fylke AND f_kommune AND f_kategori AND f_pub AND f_utd AND f_erf
   AND f_kort AND f_sprak AND f_omf AND f_sommer AND f_ans AND f_sekt AND f_rem
$$;

-- Rollback: kjør migrasjonen 20260611193000_job_facet_counts_fn på nytt
-- (CREATE OR REPLACE tilbake til v1, som leser region/kommune-kolonnene).
