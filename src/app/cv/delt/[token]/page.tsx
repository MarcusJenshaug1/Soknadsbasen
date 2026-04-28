import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseResumeById } from "@/lib/resume-server";
import { incrementViewCount } from "@/lib/cvShareToken";
import { getGoogleFontsUrl } from "@/lib/design-tokens";
import { SharedResumeView } from "./SharedResumeView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Delt CV",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedCvPage({ params }: PageProps) {
  const { token } = await params;

  const link = await prisma.resumeShareLink.findUnique({
    where: { token },
    select: {
      userId: true,
      resumeId: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!link || link.revokedAt) notFound();
  if (link.expiresAt && link.expiresAt < new Date()) notFound();

  const userData = await prisma.userData.findUnique({
    where: { userId: link.userId },
    select: { resumeData: true },
  });
  const data = parseResumeById(userData?.resumeData, link.resumeId);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-bg text-ink">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">CV-en er ikke tilgjengelig</h1>
          <p className="text-ink/70">
            CV-en denne lenken pekte til er slettet av eieren. Be avsenderen lage en ny lenke.
          </p>
        </div>
      </main>
    );
  }

  // Fire-and-forget metrics
  incrementViewCount(token);

  const ownerName =
    [data.contact?.firstName, data.contact?.lastName].filter(Boolean).join(" ").trim() ||
    link.user.name?.trim() ||
    link.user.email.split("@")[0];

  const fontsUrl = getGoogleFontsUrl(data.fontPair);

  return (
    <>
      {fontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={fontsUrl} />
      )}
      <SharedResumeView
        data={data}
        ownerName={ownerName}
        pdfUrl={`/api/cv/share/${token}/pdf`}
      />
    </>
  );
}
