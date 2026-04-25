import Link from "next/link";
import { redirect } from "next/navigation";
import { getSelgerPanelAccess } from "@/lib/auth";
import { SelgerSidebar } from "./SelgerSidebar";

export default async function SelgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getSelgerPanelAccess();
  if (!access) {
    redirect("/logg-inn?redirect=/selger");
  }

  return (
    <div className="min-h-dvh bg-[#f9f9f8] dark:bg-bg flex">
      <SelgerSidebar email={access.email} viewerRole={access.viewerRole} />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {access.viewerRole === "admin" && (
            <div className="mb-5 rounded-xl bg-[var(--sales-stage-kontaktet)]/10 border border-[var(--sales-stage-kontaktet)]/30 px-4 py-3 text-[12px] flex items-center justify-between gap-3">
              <span>
                <span className="font-medium">Admin-modus.</span>{" "}
                <span className="text-ink/65">
                  Du ser /selger fra ditt eget perspektiv (ikke en spesifikk selger). For full
                  oversikt på tvers av selgere — bruk admin-panelet.
                </span>
              </span>
              <Link
                href="/admin/selgere"
                prefetch={true}
                className="shrink-0 px-2.5 py-1 rounded-full bg-ink text-bg text-[11px] hover:opacity-90 transition-opacity"
              >
                /admin/selgere →
              </Link>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
