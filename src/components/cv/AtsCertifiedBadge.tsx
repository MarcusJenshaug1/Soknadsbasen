import { Check } from "lucide-react";

const ATS_SYSTEMS = ["Webcruiter", "ReachMee", "Workday", "Jobylon"];

type Variant = "compact" | "full" | "post-export";

export function AtsCertifiedBadge({ variant = "compact" }: { variant?: Variant }) {
  if (variant === "compact") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Check className="size-3" />
        ATS-vennlig PDF
      </span>
    );
  }

  if (variant === "post-export") {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
      >
        <div className="flex items-start gap-2">
          <Check className="size-4 mt-0.5 shrink-0 text-emerald-700" />
          <div className="text-[13px] leading-relaxed">
            <div className="font-medium">Tekstlag intakt — passerer ATS</div>
            <div className="text-emerald-800/80 mt-0.5">
              PDF-en din leses korrekt av {ATS_SYSTEMS.join(", ")} og andre vanlige
              rekrutterings-systemer.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
      <div className="flex items-start gap-3">
        <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <Check className="size-4 text-emerald-700" />
        </div>
        <div>
          <h3 className="text-[15px] font-medium text-emerald-900 mb-1">
            Alle Søknadsbasens CV-maler passerer ATS-test
          </h3>
          <p className="text-[13px] leading-[1.6] text-emerald-900/80">
            PDF-eksport bruker ekte tekstlag (ikke bilder), og er testet mot{" "}
            {ATS_SYSTEMS.join(", ")} og andre rekrutterings-systemer som er vanlige
            i Norge. Du kan verifisere selv ved å åpne PDF-en og kopiere all tekst
            (Ctrl+A, Ctrl+C). Hvis teksten kan limes inn lesbart i et tekstdokument,
            er du trygg.
          </p>
        </div>
      </div>
    </div>
  );
}
