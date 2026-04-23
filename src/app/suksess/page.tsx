import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function SuksessPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/logg-inn?redirect=/suksess");

  const { session_id } = await searchParams;
  let planLabel = "abonnement";
  let isTrialing = false;

  if (session_id) {
    try {
      const checkout = await stripe.checkout.sessions.retrieve(session_id);
      if (checkout.mode === "subscription") {
        planLabel = "månedlig abonnement";
        const subId =
          typeof checkout.subscription === "string"
            ? checkout.subscription
            : checkout.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          isTrialing = sub.status === "trialing";
        }
      } else if (checkout.mode === "payment") {
        planLabel = "6 måneders tilgang";
      }
    } catch {
      // Non-fatal — vi viser generell tekst hvis retrieve feiler.
    }
  }

  const dbSub = await prisma.subscription.findUnique({
    where: { userId: session.userId },
    select: { status: true },
  });
  const webhookLanded = dbSub !== null;

  return (
    <div className="min-h-dvh flex flex-col bg-[#14110e] text-[#faf8f5]">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-[560px] w-full text-center">
          <div className="inline-flex items-center gap-2 text-[11px] text-[#c15a3a] mb-6">
            <span className="w-1 h-1 rounded-full bg-[#c15a3a]" />
            {isTrialing ? "Prøveperiode aktiv" : "Betaling bekreftet"}
            <span className="w-1 h-1 rounded-full bg-[#c15a3a]" />
          </div>

          <h1 className="text-[44px] md:text-[64px] leading-[1] tracking-[-0.035em] font-medium mb-5">
            {isTrialing ? (
              <>
                Du er i gang.
                <br />
                Gratis i 7 dager.
              </>
            ) : (
              <>
                Takk!
                <br />
                Du er med.
              </>
            )}
          </h1>

          <p className="text-[15px] md:text-[17px] leading-[1.6] text-white/65 mb-10">
            {isTrialing
              ? "Kortet ditt belastes ikke før prøveperioden utløper. Du kan kansellere når som helst under Abonnement."
              : `Du har nå ${planLabel}. Alt er klart — la oss begynne med CV-en din.`}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 text-left">
            <NextStep
              n="01"
              title="Bygg CV-en"
              desc="Last opp PDF eller start fra bunnen"
              href="/app/cv"
            />
            <NextStep
              n="02"
              title="Legg til første jobb"
              desc="Spor søknader i pipelinen"
              href="/app/pipeline"
            />
            <NextStep
              n="03"
              title="Skriv søknadsbrev"
              desc="AI-drevet, tilpasset stillingen"
              href="/app/brev"
            />
          </div>

          <Link
            href="/app"
            className="inline-flex px-8 py-4 rounded-full bg-[#faf8f5] text-[#14110e] text-[14px] font-medium hover:bg-white transition-colors"
          >
            Åpne basen min
          </Link>

          {!webhookLanded && (
            <p className="mt-6 text-[11px] text-white/45">
              Henter abonnementsdata … kan ta noen sekunder.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NextStep({
  n,
  title,
  desc,
  href,
}: {
  n: string;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-white/20 transition-colors"
    >
      <div className="text-[10px] font-mono text-[#c15a3a] mb-2">{n}</div>
      <div className="text-[14px] font-medium mb-1">{title}</div>
      <div className="text-[11px] text-white/55 leading-[1.4]">{desc}</div>
      <div className="mt-3 text-[11px] text-white/40 group-hover:text-[#c15a3a] transition-colors">
        Gå dit →
      </div>
    </Link>
  );
}
