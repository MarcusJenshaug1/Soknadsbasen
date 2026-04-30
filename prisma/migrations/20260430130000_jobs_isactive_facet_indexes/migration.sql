-- Indekser for å speede opp /jobb listing-aggregering og related-jobs OR-spørring.
-- groupBy ["region"] / ["category"] med filter isActive=true bruker
-- (isActive, region) og (isActive, category) istedenfor full scan + sort.
-- (isActive, employerSlug) dekker OR-grenen i relaterte-jobb-spørringen.

CREATE INDEX "Job_isActive_region_idx" ON "Job"("isActive", "region");
CREATE INDEX "Job_isActive_category_idx" ON "Job"("isActive", "category");
CREATE INDEX "Job_isActive_employerSlug_idx" ON "Job"("isActive", "employerSlug");
