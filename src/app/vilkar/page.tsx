import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/vilkar",
  title: "Brukervilkår",
  description:
    "Brukervilkår for Søknadsbasen: abonnement, prøveperiode, angrerett, ansvar og oppsigelse.",
});

export default function VilkarPage() {
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
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#D5592E] mb-4 mt-6">
          Vilkår
        </div>
        <h1 className="text-[40px] md:text-[56px] leading-[1.05] tracking-[-0.03em] font-medium mb-4">
          Brukervilkår
        </h1>
        <p className="text-[13px] text-[#14110e]/55 mb-12">
          Sist oppdatert: 23. april 2026
        </p>

        <Prose>
          <h2>1. Parter og avtalegrunnlag</h2>
          <p>
            Disse vilkårene regulerer bruken av Søknadsbasen (&quot;Tjenesten&quot;)
            levert av <strong>Marcus Jenshaug</strong>, Skallestadveien 22,
            3138 Skallestad (&quot;Leverandøren&quot;, &quot;vi&quot;). Ved å opprette konto
            aksepterer du (&quot;Kunden&quot;, &quot;du&quot;) disse vilkårene samt vår{" "}
            <Link href="/personvern">personvernerklæring</Link>.
          </p>
          <p>
            Tjenesten drives av Marcus Jenshaug som privatperson. Det er ikke
            etablert selskap. Ved oppnådd omsetningsgrense vil virksomheten
            registreres og vilkårene oppdateres tilsvarende.
          </p>

          <h2>2. Om tjenesten</h2>
          <p>
            Søknadsbasen er en digital plattform for å bygge CV-er, skrive
            søknadsbrev og administrere jobbsøknadsprosesser. Tjenesten
            leveres som en abonnementsbasert SaaS-løsning via{" "}
            <strong>søknadsbasen.no</strong>.
          </p>

          <h2>3. Priser og betaling</h2>
          <ul>
            <li>
              <strong>Månedlig abonnement</strong>: 79 kr/måned. Fornyes
              automatisk hver måned inntil oppsigelse.
            </li>
            <li>
              <strong>Engangsbetaling</strong>: 299 kr for 6 måneders
              tilgang. Fornyes ikke automatisk.
            </li>
          </ul>
          <p>
            Alle priser er oppgitt i norske kroner. Leverandøren er ikke
            MVA-registrert, og prisene er derfor uten merverdiavgift. Ved
            MVA-registrering vil det varsles, og priser kan justeres.
            Betaling håndteres av Stripe Payments Europe Ltd. Vi lagrer
            aldri kortdata.
          </p>

          <h2>4. Gratis prøveperiode</h2>
          <p>
            Nye kunder som velger månedlig abonnement kan benytte 7 dagers
            gratis prøveperiode. Vilkårene for prøveperioden:
          </p>
          <ul>
            <li>
              Kortopplysninger registreres ved oppstart, men ingen belastning
              skjer i prøveperioden.
            </li>
            <li>
              Ved prøveperiodens utløp belastes kortet automatisk for 79 kr
              og månedlig abonnement starter.
            </li>
            <li>
              Kunden kan kansellere når som helst i prøveperioden via{" "}
              <strong>Abonnement → Administrer abonnement</strong> uten å
              bli belastet.
            </li>
            <li>
              Prøveperioden gjelder kun én gang per kunde.
            </li>
          </ul>

          <h2>5. Angrerett</h2>
          <p>
            Tjenesten er en digital ytelse som leveres umiddelbart etter
            bestilling. I henhold til angrerettsloven § 22 bokstav n frafaller
            kunden angreretten ved å gi uttrykkelig forhåndssamtykke til at
            leveringen starter før angrefristen utløper, og ved å erkjenne at
            angreretten dermed faller bort.
          </p>
          <p>
            Ved å bekrefte bestillingen og klikke &quot;Prøv gratis i 7
            dager&quot; eller &quot;Kjøp 6 måneder&quot; gir du slikt uttrykkelig
            samtykke og erkjenner at angreretten bortfaller når levering
            (tilgang til Tjenesten) har startet.
          </p>
          <p>
            Den gratis prøveperioden fungerer i praksis som en angrefrist —
            kunden kan kansellere innen 7 dager uten kostnad.
          </p>

          <h2>6. Oppsigelse</h2>
          <ul>
            <li>
              <strong>Månedlig</strong>: kan sies opp når som helst via
              Stripe-kundeportalen tilgjengelig under{" "}
              <strong>/app/billing</strong>. Oppsigelsen trer i kraft ved
              utløpet av inneværende betalingsperiode.
            </li>
            <li>
              <strong>Engangsbetaling</strong>: løper ut 6 måneder etter
              kjøp uten videre oppsigelse.
            </li>
            <li>
              Vi kan si opp abonnementet med 14 dagers skriftlig varsel ved
              vesentlig brudd på vilkårene eller misbruk av tjenesten.
            </li>
          </ul>

          <h2>7. Kundens plikter</h2>
          <p>Kunden forplikter seg til å:</p>
          <ul>
            <li>oppgi korrekt og oppdatert kontaktinformasjon,</li>
            <li>holde innloggingsdetaljer konfidensielle,</li>
            <li>ikke dele kontoen med andre,</li>
            <li>
              ikke laste opp eller lagre ulovlig, krenkende eller
              opphavsrettsbeskyttet innhold uten rettighet,
            </li>
            <li>
              ikke forsøke å omgå tekniske sikkerhetsmekanismer, reverse
              engineer koden eller overbelaste tjenesten.
            </li>
          </ul>

          <h2>8. Eiendomsrett til data og innhold</h2>
          <p>
            Du eier alt innhold du legger inn i Tjenesten (CV-er,
            søknadsbrev, notater, jobbsøknads-data). Vi krever ingen
            rettigheter utover det som er strengt nødvendig for å levere
            Tjenesten.
          </p>
          <p>
            Du kan når som helst laste ned dataene dine som PDF eller i
            maskinlesbart format. Ved kontosletting fjernes alt ditt innhold
            innen 30 dager (se personvernerklæringen).
          </p>

          <h2>9. Immaterielle rettigheter</h2>
          <p>
            Leverandøren eier alle rettigheter til selve Tjenesten,
            inkludert kildekode, design, maler og dokumentasjon. Du får en
            ikke-eksklusiv, ikke-overførbar bruksrett så lenge abonnementet
            er aktivt.
          </p>

          <h2>10. Tilgjengelighet og vedlikehold</h2>
          <p>
            Vi tilstreber 99,5 % oppetid, men gir ingen garanti. Planlagt
            vedlikehold varsles på forhånd når mulig. Ved nedetid over 24
            timer sammenhengende kan kunden kreve forholdsmessig
            kompensasjon tilsvarende abonnementsprisen for perioden.
          </p>

          <h2>11. Ansvarsbegrensning</h2>
          <p>
            Tjenesten leveres &quot;som den er&quot;. Leverandøren er ikke ansvarlig
            for:
          </p>
          <ul>
            <li>
              indirekte tap eller følgeskader (tapt arbeidsinntekt, tapt
              jobbmulighet, driftsavbrudd),
            </li>
            <li>tap av data som skyldes kundens egne handlinger,</li>
            <li>
              innhold eller tjenester levert av tredjeparter (f.eks. Stripe,
              Supabase, Gemini).
            </li>
          </ul>
          <p>
            Det samlede ansvaret er under enhver omstendighet begrenset til
            beløpet kunden har betalt de siste 6 månedene forut for
            kravet. Ansvarsbegrensningen gjelder ikke ved grov uaktsomhet
            eller forsett.
          </p>

          <h2>12. Force majeure</h2>
          <p>
            Leverandøren er ikke ansvarlig for forsinkelser eller manglende
            oppfyllelse som skyldes force majeure, herunder tredjeparts
            infrastruktursvikt, cyber-angrep, pandemi, streik eller
            myndighetspålegg.
          </p>

          <h2>13. Endring av vilkår</h2>
          <p>
            Vi kan oppdatere disse vilkårene. Vesentlige endringer varsles
            på e-post og i Tjenesten minst 30 dager før ikrafttredelse.
            Fortsatt bruk etter endringen anses som aksept. Dersom du ikke
            aksepterer endringene, kan du si opp abonnementet.
          </p>

          <h2>14. Lovvalg og verneting</h2>
          <p>
            Vilkårene reguleres av norsk rett. Tvister søkes løst i
            minnelighet. Lykkes ikke dette, er verneting Leverandørens
            hjemting, <strong>Vestfold tingrett</strong>.
          </p>
          <p>
            Forbrukerkunder kan også kontakte Forbrukertilsynet eller
            benytte EUs nettbaserte tvisteløsningsplattform på{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
            >
              ec.europa.eu/consumers/odr
            </a>
            .
          </p>

          <h2>15. Kontakt</h2>
          <p>
            <strong>Marcus Jenshaug</strong>
            <br />
            Skallestadveien 22
            <br />
            3138 Skallestad
            <br />
            E-post:{" "}
            <a href="mailto:marcus@jenshaug.no">marcus@jenshaug.no</a>
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
        [&_li]:marker:text-[#D5592E]/60
        [&_a]:text-[#D5592E] [&_a]:underline-offset-2 hover:[&_a]:underline
        [&_strong]:text-[#14110e] [&_strong]:font-medium
      "
    >
      {children}
    </div>
  );
}
