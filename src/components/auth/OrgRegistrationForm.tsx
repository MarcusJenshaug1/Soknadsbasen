"use client";

import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/Pill";

const label =
  "text-[11px] uppercase tracking-wider text-[#14110e]/55 dark:text-[#f0ece6]/55 block mb-2";
const underline =
  "w-full bg-transparent border-b border-black/15 dark:border-white/15 focus:border-accent py-2.5 outline-none text-[15px]";

interface BrregData {
  found: boolean;
  name?: string;
  type?: string;
  error?: string;
}

export function OrgRegistrationForm() {
  const [orgName, setOrgName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [message, setMessage] = useState("");
  const [brregData, setBrregData] = useState<BrregData | null>(null);
  const [brregLoading, setBrregLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Real-time BRREG lookup
  useEffect(() => {
    if (!orgNumber || orgNumber.length < 4) {
      setBrregData(null);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setBrregLoading(true);
      try {
        const res = await fetch(`/api/brreg/lookup?orgNumber=${encodeURIComponent(orgNumber)}`);
        const data: BrregData = await res.json();
        setBrregData(data);
        if (data.found && data.name && !orgName) {
          setOrgName(data.name);
        }
      } catch (err) {
        console.error("BRREG lookup failed:", err);
        setBrregData({ found: false, error: "Lookup failed" });
      } finally {
        setBrregLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [orgNumber]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/org-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName,
          orgNumber: orgNumber || undefined,
          contactName,
          contactEmail,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Noe gikk galt");
        return;
      }

      setSent(true);
    } catch (err) {
      console.error("Submission failed:", err);
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40 px-5 py-4">
        <p className="text-[13px] font-medium text-green-800 dark:text-green-300">
          Søknaden er sendt!
        </p>
        <p className="text-[12px] text-green-700/70 dark:text-green-400/70 mt-0.5">
          Vi går gjennom søknaden din og tar kontakt snart.
        </p>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel className="mb-4">Organisasjon</SectionLabel>
      <h1 className="text-[36px] md:text-[40px] leading-[1] tracking-[-0.03em] font-medium mb-3">
        Søk om organisasjonkonto.
      </h1>
      <p className="text-[14px] text-[#14110e]/65 dark:text-[#f0ece6]/65 mb-8">
        Få tilgang for hele organisasjonen din.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={label}>Organisasjonsnavn</label>
          <input
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme AS"
            className={underline}
          />
        </div>

        <div>
          <label className={label}>Organisasjonsnummer (valgfritt)</label>
          <div>
            <input
              value={orgNumber}
              onChange={(e) => setOrgNumber(e.target.value)}
              placeholder="989 645 917"
              className={underline}
            />
            {brregLoading && (
              <p className="text-[12px] text-[#14110e]/45 dark:text-[#f0ece6]/45 mt-1">
                Søker i Brønnøysund…
              </p>
            )}
            {brregData && brregData.found && (
              <p className="text-[12px] text-green-700 dark:text-green-400 mt-1">
                ✓ Funnet: {brregData.name} ({brregData.type})
              </p>
            )}
            {brregData && !brregData.found && (
              <p className="text-[12px] text-[#14110e]/45 dark:text-[#f0ece6]/45 mt-1">
                Ikke funnet i Brønnøysund
              </p>
            )}
          </div>
        </div>

        <div>
          <label className={label}>Kontaktperson</label>
          <input
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Marit Larsen"
            className={underline}
          />
        </div>

        <div>
          <label className={label}>E-post</label>
          <input
            required
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="navn@org.no"
            className={underline}
          />
        </div>

        <div>
          <label className={label}>Melding (valgfritt)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Fortell litt om organisasjonen og hva dere trenger…"
            rows={3}
            className={`${underline} resize-none`}
          />
        </div>

        {error && <p className="text-[12px] text-accent">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 mt-4 rounded-full bg-accent text-bg text-[14px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] transition-colors disabled:opacity-50"
        >
          {submitting ? "Sender søknad…" : "Send søknad"}
        </button>

        <p className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 leading-relaxed pt-1">
          Ved innsending godtar du våre vilkår og personvernerklæring.
        </p>
      </form>
    </div>
  );
}
