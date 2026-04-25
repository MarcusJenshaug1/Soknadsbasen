import { redirect } from "next/navigation";
import { getSalesRepSession } from "@/lib/auth";
import { SelgerSidebar } from "./SelgerSidebar";

export default async function SelgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSalesRepSession();
  if (!session) {
    redirect("/logg-inn?redirect=/selger");
  }

  return (
    <div className="min-h-dvh bg-[#f9f9f8] dark:bg-bg flex">
      <SelgerSidebar email={session.email} />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
