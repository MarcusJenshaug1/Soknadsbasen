import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  const payload = await req.text();

  // Verify Svix signature when secret is configured (skip in local dev)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    try {
      event = resend.webhooks.verify({
        payload,
        headers: {
          id: req.headers.get("svix-id") ?? "",
          timestamp: req.headers.get("svix-timestamp") ?? "",
          signature: req.headers.get("svix-signature") ?? "",
        },
        webhookSecret: secret,
      });
    } catch {
      console.error("[resend/inbound] Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    try {
      event = JSON.parse(payload);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  if (event?.type !== "email.received") {
    return NextResponse.json({ ok: true, skipped: event?.type });
  }

  const d = event.data;
  const emailId: string = d.email_id;
  const rawFrom: string = d.from ?? "";

  const nameMatch = rawFrom.match(/^(.+?)\s*<(.+?)>$/);
  const fromName = nameMatch ? nameMatch[1].trim() : null;
  const fromAddress = nameMatch ? nameMatch[2].trim() : rawFrom.trim();
  const toAddress: string = Array.isArray(d.to) ? (d.to[0] ?? "") : (d.to ?? "");

  // Fetch full body (not included in webhook payload per Resend docs)
  let htmlBody: string | null = null;
  let textBody: string | null = null;
  try {
    const { data: full } = await resend.emails.receiving.get(emailId);
    if (full) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      htmlBody = (full as any).html ?? null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      textBody = (full as any).text ?? null;
    }
  } catch (err) {
    console.warn("[resend/inbound] Could not fetch full email body:", err);
  }

  await prisma.inboundEmail.create({
    data: {
      fromAddress,
      fromName,
      toAddress,
      subject: d.subject ?? "(ingen emne)",
      textBody,
      htmlBody,
      messageId: d.message_id ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
