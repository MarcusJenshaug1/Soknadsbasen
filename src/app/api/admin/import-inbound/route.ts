import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST() {
  const session = await getSession();
  if (!session || session.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listData, error } = await (resend.emails.receiving.list as any)();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emails: any[] = listData?.data ?? listData ?? [];
  let imported = 0;
  let skipped = 0;

  for (const item of emails) {
    const emailId: string = item.id ?? item.email_id;
    if (!emailId) continue;

    // Fetch full body
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let full: any = null;
    try {
      const { data } = await resend.emails.receiving.get(emailId);
      full = data;
    } catch {
      skipped++;
      continue;
    }
    if (!full) { skipped++; continue; }

    const rawFrom: string = full.from ?? item.from ?? "";
    const nameMatch = rawFrom.match(/^(.+?)\s*<(.+?)>$/);
    const fromName = nameMatch ? nameMatch[1].trim() : null;
    const fromAddress = nameMatch ? nameMatch[2].trim() : rawFrom.trim();
    const toRaw = full.to ?? item.to;
    const toAddress: string = Array.isArray(toRaw) ? (toRaw[0] ?? "") : (toRaw ?? "");
    const subject: string = full.subject ?? item.subject ?? "(ingen emne)";

    // Skip if already stored (match on fromAddress + subject + approx time)
    const existing = await prisma.inboundEmail.findFirst({
      where: { fromAddress, subject },
      select: { id: true },
    });
    if (existing) { skipped++; continue; }

    await prisma.inboundEmail.create({
      data: {
        fromAddress,
        fromName,
        toAddress,
        subject,
        textBody: full.text ?? null,
        htmlBody: full.html ?? null,
      },
    });
    imported++;
  }

  return NextResponse.json({ ok: true, imported, skipped, total: emails.length });
}
