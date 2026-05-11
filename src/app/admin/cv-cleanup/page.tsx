import { CvCleanupClient } from "./CvCleanupClient";

export const dynamic = "force-dynamic";

export default function CvCleanupPage() {
  return (
    <div>
      <h1 className="text-[22px] font-semibold mb-2">CV-cleanup</h1>
      <p className="text-[13px] text-ink/60 mb-8 max-w-2xl leading-[1.55]">
        Tidligere impersonering-bug skrev admin sin CV inn i target-brukernes
        UserData-rad. Denne siden identifiserer rader hvor lagret CV-email ikke
        matcher User-radens email, og resetter resumeData til <code>{`'{}'`}</code>
        slik at target får ren slate.
      </p>
      <CvCleanupClient />
    </div>
  );
}
