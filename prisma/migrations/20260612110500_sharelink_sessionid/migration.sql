-- Delingslenker bindes til sesjonen de ble laget i, så en lenke fra sesjon A
-- ikke automatisk eksponerer alt brukeren gjør i senere sesjoner. null =
-- legacy-lenke (konto-vid visning). Cascade: slettes sesjonen, dør lenken —
-- SetNull ville stille gjort en sesjonslenke konto-vid (personvern-overraskelse).

ALTER TABLE "ShareLink" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "JobSearchSession"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Rollback: ALTER TABLE "ShareLink" DROP CONSTRAINT "ShareLink_sessionId_fkey";
--           ALTER TABLE "ShareLink" DROP COLUMN "sessionId";
