import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export const metadata = {
  title: "Personvernerklæring – Søknadsbasen",
  description:
    "Hvordan Søknadsbasen behandler personopplysninger i tråd med GDPR og norsk personvernlovgivning.",
};

export default function PersonvernPage() {
  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e]">
      <header className="max-w-[760px] mx-auto px-5 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-between">
        <Logo href="/" />
        <Link
          href="/"
          className="text-[13px] text-[#14110e]/65 hover:text-[#14110e]"
        >
          ← Tilbake
        </Link>
      </header>

      <main className="max-w-[720px] mx-auto px-5 md:px-8 pb-24">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#c15a3a] mb-4 mt-6">
          Personvern
        </div>
        <h1 className="text-[40px] md:text-[56px] leading-[1.05] tracking-[-0.03em] font-medium mb-4">
          Personvernerklæring
        </h1>
        <p className="text-[13px] text-[#14110e]/55 mb-12">
          Sist oppdatert: 23. april 2026
        </p>

        <Prose>
          <h2>1. Behandlingsansvarlig</h2>
          <p>
            Behandlingsansvarlig for personopplysninger samlet gjennom
            Søknadsbasen er <strong>Marcus Jenshaug</strong>, Skallestadveien 22,
            3138 Skallestad. Kontakt:{" "}
            <a href="mailto:marcus@jenshaug.no">marcus@jenshaug.no</a>.
          </p>

          <h2>2. Hvilke opplysninger vi samler</h2>
          <p>Vi samler følgende kategorier av personopplysninger:</p>
          <ul>
            <li>
              <strong>Kontoopplysninger</strong>: navn, e-postadresse,
              passord (hashet via Supabase Auth).
            </li>
            <li>
              <strong>Profil- og CV-innhold</strong>: utdanning,
              arbeidserfaring, ferdigheter, referanser, profilbilde,
              søknadsbrev og annet innhold du selv legger inn.
            </li>
            <li>
              <strong>Jobbsøknads-data</strong>: stillinger du sporer,
              selskaper, frister, notater og oppfølginger.
            </li>
            <li>
              <strong>Betalingsopplysninger</strong>: kortnummer og
              betalingsdetaljer lagres aldri hos oss — de håndteres av Stripe
              (se pkt. 6). Vi lagrer kun Stripe-kunde-ID, abonnementsstatus
              og fornyelsesdato.
            </li>
            <li>
              <strong>Tekniske data</strong>: IP-adresse, nettlesertype og
              enhetstype i feillogger og sikkerhetslogger (maks 30 dager).
            </li>
          </ul>

          <h2>3. Formål og rettsgrunnlag</h2>
          <table>
            <thead>
              <tr>
                <th>Formål</th>
                <th>Rettsgrunnlag (GDPR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Levere tjenesten (lagring av CV, jobbsøknader osv.)</td>
                <td>Art. 6 (1) (b) — avtale</td>
              </tr>
              <tr>
                <td>Fakturering og betalingshåndtering</td>
                <td>Art. 6 (1) (b) — avtale, og (c) — rettslig forpliktelse</td>
              </tr>
              <tr>
                <td>Sikkerhet, feilsøking og misbruksforebygging</td>
                <td>Art. 6 (1) (f) — berettiget interesse</td>
              </tr>
              <tr>
                <td>
                  Transaksjonelle e-poster (kvittering, passord-reset,
                  abonnementsvarsler)
                </td>
                <td>Art. 6 (1) (b) — avtale</td>
              </tr>
              <tr>
                <td>Markedsføring (kun med eksplisitt samtykke)</td>
                <td>Art. 6 (1) (a) — samtykke</td>
              </tr>
            </tbody>
          </table>

          <h2>4. Hvor lenge vi lagrer opplysninger</h2>
          <ul>
            <li>
              <strong>Aktiv konto</strong>: så lenge du har en konto hos oss.
            </li>
            <li>
              <strong>Etter sletting</strong>: kontoen og alt CV-innhold
              slettes innen 30 dager etter at du selv ber om sletting.
            </li>
            <li>
              <strong>Fakturadata</strong>: oppbevares i 5 år i henhold til{" "}
              bokføringsloven § 13, selv om kontoen slettes.
            </li>
            <li>
              <strong>Sikkerhetslogger</strong>: 30 dager.
            </li>
          </ul>

          <h2>5. Hvor opplysningene lagres</h2>
          <p>
            Alle persondata lagres i EU/EØS:
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> (database, autentisering, filer) —
              region <em>eu-north-1</em> (Stockholm).
            </li>
            <li>
              <strong>Vercel</strong> (hosting av nettsiden) — EU-regioner.
            </li>
          </ul>

          <h2>6. Databehandlere og tredjeparter</h2>
          <p>
            Vi deler personopplysninger med følgende databehandlere, som alle
            er bundet av databehandleravtaler og GDPR-samsvar:
          </p>
          <ul>
            <li>
              <strong>Supabase Inc.</strong> — database, autentisering og
              filoppbevaring. Lagring i EU.
            </li>
            <li>
              <strong>Stripe Payments Europe, Ltd.</strong> — betalings­behandling.
              Stripe er PCI DSS-sertifisert og behandlingsansvarlig for
              kortdata.
            </li>
            <li>
              <strong>Vercel Inc.</strong> — hosting. Lagring i EU.
            </li>
            <li>
              <strong>Google (Gemini API)</strong> — valgfri AI-assistanse
              (CV-forbedring, jobb-analyse). Data sendes kun når du aktivt
              bruker disse funksjonene. Google behandler data i tråd med sine
              egne vilkår for Gemini API.
            </li>
          </ul>
          <p>
            Vi selger <strong>aldri</strong> personopplysninger videre og
            bruker dem ikke til tredjeparts-markedsføring.
          </p>

          <h2>7. Dine rettigheter</h2>
          <p>Du har rett til å:</p>
          <ul>
            <li>få innsyn i hvilke opplysninger vi har om deg,</li>
            <li>få rettet uriktige opplysninger,</li>
            <li>få slettet kontoen og tilhørende data,</li>
            <li>laste ned dine data i et lesbart format (dataportabilitet),</li>
            <li>trekke tilbake samtykke til markedsføring når som helst,</li>
            <li>klage til Datatilsynet (datatilsynet.no).</li>
          </ul>
          <p>
            Kontakt oss på{" "}
            <a href="mailto:marcus@jenshaug.no">marcus@jenshaug.no</a> for å
            utøve rettighetene dine. Vi svarer innen 30 dager.
          </p>

          <h2>8. Informasjonskapsler (cookies)</h2>
          <p>
            Vi bruker kun tekniske cookies som er nødvendige for innlogging
            og sesjonshåndtering. Vi bruker ikke tredjeparts analyse- eller
            markedsføringscookies uten ditt samtykke.
          </p>

          <h2>9. Sikkerhet</h2>
          <p>
            All kommunikasjon er kryptert med TLS. Passord lagres hashet
            (aldri i klartekst). Servere ligger i sikre datasentre i
            EU/EØS. Vi benytter rad-nivå sikkerhet (RLS) i databasen slik at
            hver bruker kun har tilgang til egne data.
          </p>

          <h2>10. Endringer i erklæringen</h2>
          <p>
            Vi kan oppdatere denne erklæringen ved endringer i tjenesten
            eller lovverket. Vesentlige endringer varsles på e-post minst 14
            dager i forveien. Gjeldende versjon finnes alltid på denne
            siden.
          </p>

          <h2>11. Kontakt</h2>
          <p>
            Spørsmål om personvern eller generell kontakt:{" "}
            <a href="mailto:marcus@jenshaug.no">marcus@jenshaug.no</a>.
          </p>
        </Prose>
      </main>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        text-[15px] leading-[1.7] text-[#14110e]/85
        [&_h2]:text-[22px] [&_h2]:md:text-[26px] [&_h2]:leading-[1.2]
        [&_h2]:tracking-[-0.02em] [&_h2]:font-medium [&_h2]:text-[#14110e]
        [&_h2]:mt-12 [&_h2]:mb-4
        [&_p]:mb-4
        [&_ul]:mb-5 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1.5
        [&_li]:marker:text-[#c15a3a]/60
        [&_a]:text-[#c15a3a] [&_a]:underline-offset-2 hover:[&_a]:underline
        [&_strong]:text-[#14110e] [&_strong]:font-medium
        [&_table]:w-full [&_table]:my-6 [&_table]:border-collapse
        [&_table]:text-[13px]
        [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_th]:border-b [&_th]:border-black/15 [&_th]:font-medium
        [&_td]:py-2 [&_td]:pr-4 [&_td]:border-b [&_td]:border-black/8
        [&_td]:align-top
      "
    >
      {children}
    </div>
  );
}
