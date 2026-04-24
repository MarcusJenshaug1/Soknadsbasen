import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const [userCount, orgCount, subCount] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.subscription.count({ where: { status: { in: ["active", "trialing"] } } }),
  ]);

  const cards = [
    { label: "Totalt brukere", value: userCount },
    { label: "Organisasjoner", value: orgCount },
    { label: "Aktive abonnement", value: subCount },
  ];

  return (
    <div>
      <h1 className="text-[22px] font-semibold mb-8">Oversikt</h1>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-black/8 p-5">
            <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-1">{c.label}</div>
            <div className="text-[28px] font-semibold">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
