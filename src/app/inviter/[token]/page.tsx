import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InviterClient } from "./InviterClient";

export default async function InviterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    select: {
      email: true,
      expiresAt: true,
      org: { select: { displayName: true, logoUrl: true } },
    },
  });

  if (!invite) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold mb-2">Invitasjon ikke funnet</h1>
          <p className="text-[14px] text-ink/60">Lenken er ugyldig eller har allerede blitt brukt.</p>
        </div>
      </div>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold mb-2">Invitasjonen er utløpt</h1>
          <p className="text-[14px] text-ink/60">Be om en ny invitasjon fra organisasjonsadministratoren.</p>
        </div>
      </div>
    );
  }

  const session = await getSession();

  if (!session) {
    redirect(`/logg-inn?redirect=/inviter/${token}`);
  }

  if (session.email.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-[22px] font-semibold mb-2">Feil konto</h1>
          <p className="text-[14px] text-ink/60">
            Denne invitasjonen er til <strong>{invite.email}</strong>, men du er logget inn som{" "}
            <strong>{session.email}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {invite.org.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={invite.org.logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain mb-6 mx-auto" />
        )}
        <div className="text-center mb-8">
          <h1 className="text-[22px] font-semibold">{invite.org.displayName}</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            Du er invitert til å bli med i {invite.org.displayName} på Søknadsbasen.
          </p>
        </div>
        <InviterClient token={token} orgDisplayName={invite.org.displayName} />
        <p className="mt-4 text-center text-[12px] text-ink/40">
          Logget inn som {session.email} ·{" "}
          <Link href="/logg-inn" className="underline">Bytt konto</Link>
        </p>
      </div>
    </div>
  );
}
