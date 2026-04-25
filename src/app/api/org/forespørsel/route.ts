import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { assignLeadRoundRobin, attachContactToLead } from "@/lib/sales/assignment";
import { notifySalesRep } from "@/lib/sales/notify";

export async function POST(req: Request) {
  let body: { orgName: string; contactName: string; contactEmail: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const { orgName, contactName, contactEmail } = body;
  if (!orgName?.trim() || !contactName?.trim() || !contactEmail?.trim()) {
    return NextResponse.json({ error: "Mangler påkrevde felt" }, { status: 400 });
  }

  const inquiry = await prisma.orgInquiry.create({
    data: {
      orgName: orgName.trim(),
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      message: body.message?.trim() || null,
    },
  });

  // Round-robin auto-tildeling. Hopper stille hvis ingen aktive selgere finnes.
  try {
    const assigned = await assignLeadRoundRobin({
      source: "inquiry",
      companyName: orgName.trim(),
      title: `${orgName.trim()} \u2014 ${contactName.trim()}`,
      notes: body.message?.trim() || null,
      orgInquiryId: inquiry.id,
    });
    if (assigned) {
      await attachContactToLead({
        leadId: assigned.leadId,
        name: contactName.trim(),
        email: contactEmail.trim().toLowerCase(),
        role: "Beslutningstaker",
        isPrimary: true,
      });
      await notifySalesRep(assigned.salesRepId, {
        title: `Ny lead: ${orgName.trim()}`,
        body: `${contactName.trim()} \u00f8nsker kontakt.`,
        url: `/selger/leads/${assigned.leadId}`,
      });
    }
  } catch (err) {
    console.error("[forespørsel] round-robin failed:", err);
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "marcus@redi.as";
  await sendMail({
    to: adminEmail,
    subject: `Org-forespørsel: ${orgName.trim()}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #D5592E;">Ny organisasjonsforespørsel</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 140px;">Organisasjon</td><td style="font-weight: 600;">${orgName.trim()}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Kontaktperson</td><td>${contactName.trim()}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">E-post</td><td><a href="mailto:${contactEmail.trim()}">${contactEmail.trim()}</a></td></tr>
          ${body.message?.trim() ? `<tr><td style="padding: 6px 0; color: #888; font-size: 13px; vertical-align: top;">Melding</td><td style="white-space: pre-wrap;">${body.message.trim()}</td></tr>` : ""}
        </table>
        <p style="margin: 0;"><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/orger" style="color: #D5592E;">Se alle forespørsler →</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Søknadsbasen</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
