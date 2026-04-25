import { NextResponse } from "next/server";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  eligible: "Klar",
  paid: "Utbetalt",
  clawback: "Clawback",
  voided: "Annullert",
};

function formatPeriod(period: string | null): { gte: Date; lt: Date; label: string } | null {
  if (!period) return null;
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const gte = new Date(year, month, 1);
  const lt = new Date(year, month + 1, 1);
  return { gte, lt, label: `${m[1]}-${m[2]}` };
}

export async function GET(req: Request) {
  const access = await getSelgerPanelAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  const period = formatPeriod(url.searchParams.get("period"));

  const entries = await prisma.commissionEntry.findMany({
    where: {
      ...(access.viewerRole === "admin" ? {} : { salesRepId: access.userId }),
      ...(period ? { paidAt: { gte: period.gte, lt: period.lt } } : {}),
    },
    orderBy: { paidAt: "desc" },
    include: {
      org: { select: { displayName: true } },
      payout: { select: { paidAt: true, paymentRef: true } },
      salesRep: { select: { name: true, email: true } },
    },
  });

  const filenameBase = `provisjon-${period?.label ?? "alle"}`;

  if (format === "csv") {
    const header =
      "\uFEFFFaktura-ID;Selger;Kunde;Betalt;Belop_eks_mva_kr;Provisjon_kr;Status;Frigis;Utbetalt;Ref\n";
    const rows = entries
      .map((e) => {
        const cols = [
          e.stripeInvoiceId,
          e.salesRep.name ?? e.salesRep.email,
          e.org.displayName,
          e.paidAt.toISOString().slice(0, 10),
          (e.invoiceAmountCents / 100).toFixed(2).replace(".", ","),
          (e.amountCents / 100).toFixed(2).replace(".", ","),
          STATUS_LABEL[e.status] ?? e.status,
          e.status === "pending" ? e.holdUntil.toISOString().slice(0, 10) : "",
          e.payout ? e.payout.paidAt.toISOString().slice(0, 10) : "",
          e.payout?.paymentRef ?? "",
        ].map((c) => String(c ?? "").replace(/;/g, ","));
        return cols.join(";");
      })
      .join("\n");
    return new Response(header + rows + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  if (format === "pdf") {
    const total = entries.reduce((s, e) => s + e.amountCents, 0);
    const html = `<!DOCTYPE html>
<html lang="nb"><head><meta charset="utf-8" />
<title>${filenameBase}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #14110e; font-size: 11px; line-height: 1.4; }
  h1 { font-size: 18px; margin: 0 0 6px; }
  .meta { color: rgba(20,17,14,0.55); margin-bottom: 16px; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; color: rgba(20,17,14,0.55); padding: 6px 8px; border-bottom: 1px solid rgba(0,0,0,0.1); }
  td { padding: 6px 8px; border-bottom: 0.5px solid rgba(0,0,0,0.06); font-family: ui-monospace, monospace; font-size: 10px; }
  td.num { text-align: right; }
  .total { margin-top: 14px; text-align: right; font-size: 12px; font-weight: 600; }
</style></head><body>
<h1>Provisjons-rapport</h1>
<div class="meta">Periode: ${period?.label ?? "Alle"} · Generert: ${new Date().toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })} · ${entries.length} entries</div>
<table>
<thead><tr>
  <th>Faktura</th><th>Kunde</th><th>Betalt</th><th class="num">Beløp</th><th class="num">Provisjon</th><th>Status</th>
</tr></thead>
<tbody>
${entries
  .map(
    (e) => `<tr>
  <td>${e.stripeInvoiceId}</td>
  <td>${escapeHtml(e.org.displayName)}</td>
  <td>${e.paidAt.toISOString().slice(0, 10)}</td>
  <td class="num">${(e.invoiceAmountCents / 100).toLocaleString("nb-NO")} kr</td>
  <td class="num">${(e.amountCents / 100).toLocaleString("nb-NO")} kr</td>
  <td>${STATUS_LABEL[e.status] ?? e.status}</td>
</tr>`,
  )
  .join("")}
</tbody>
</table>
<div class="total">Total provisjon: ${(total / 100).toLocaleString("nb-NO")} kr</div>
</body></html>`;
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${filenameBase}.html"`,
      },
    });
  }

  return NextResponse.json({ error: "Ugyldig format" }, { status: 400 });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return ch;
    }
  });
}
