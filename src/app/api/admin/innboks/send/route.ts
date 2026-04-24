import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";

const PUNYCODE_DOMAIN = "xn--sknadsbasen-ggb.no";

function buildFrom(fromType: string, userName: string | null): string {
  if (fromType === "noreply") return `Søknadsbasen <noreply@${PUNYCODE_DOMAIN}>`;
  if (fromType === "post") return `Søknadsbasen <post@${PUNYCODE_DOMAIN}>`;
  // "user" — first name from profile
  const first = userName?.split(" ")[0] ?? "Marcus";
  const localPart = first.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a").replace(/[^a-z0-9]/g, "");
  return `${first} <${localPart}@${PUNYCODE_DOMAIN}>`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  let body: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    inReplyTo?: string;
    from?: string; // "user" | "noreply" | "post"
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const { to, subject } = body;
  const text = body.text?.trim() ?? "";
  const html = body.html?.trim() ?? "";
  if (!to?.trim() || !subject?.trim() || (!text && !html)) {
    return NextResponse.json({ error: "Mangler påkrevde felt" }, { status: 400 });
  }

  const fromHeader = buildFrom(body.from ?? "user", session.name);
  const htmlBody = html || `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;

  try {
    await sendMail({
      to: to.trim(),
      subject: subject.trim(),
      html: htmlBody,
      from: fromHeader,
    });
  } catch (err) {
    console.error("[innboks/send] sendMail failed:", err);
    const msg = err instanceof Error ? err.message : "Sending feilet";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await prisma.sentEmail.create({
    data: {
      toAddress: to.trim(),
      subject: subject.trim(),
      textBody: text || null,
      htmlBody: htmlBody,
      inReplyTo: body.inReplyTo ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
