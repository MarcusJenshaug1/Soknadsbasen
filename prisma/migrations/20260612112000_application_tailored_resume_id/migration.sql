-- Per-søknad AI-skreddersydd CV: nøkkel inn i UserData.resumeData
-- ._resumeDataMap (klient-eid multi-CV-lager), bevisst ikke FK — samme
-- mønster som ResumeShareLink.resumeId.

ALTER TABLE "JobApplication" ADD COLUMN "tailoredResumeId" TEXT;

-- Rollback: ALTER TABLE "JobApplication" DROP COLUMN "tailoredResumeId";
