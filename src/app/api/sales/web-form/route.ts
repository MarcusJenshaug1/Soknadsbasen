import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignLeadRoundRobin, attachContactToLead } from "@/lib/sales/assignment";
import { notifySalesRep } from "@/lib/sales/notify";

export const runtime = "nodejs";

/// Public web-form endpoint. Embeddable widget POSTs hit. Honeypot beskyttet.
export async function POST(req: Request) {
  let body: {
    companyName?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    employees?: string | number;
    message?: string;
    /// Honeypot — skal være tom. Hvis utfylt = bot.
    website_url?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  if (typeof body.website_url === "string" && body.website_url.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const companyName = String(body.companyName ?? "").trim();
  const contactName = String(body.contactName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!companyName || !contactName || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "Manglende felter" }, { status: 400 });
  }

  const inquiry = await prisma.orgInquiry.create({
    data: {
      orgName: companyName,
      contactName,
      contactEmail: email,
      message: body.message?.toString().trim() || null,
    },
  });

  try {
    const assigned = await assignLeadRoundRobin({
      source: "web_form",
      companyName,
      title: `${companyName} (web-form)`,
      notes: body.message?.toString().trim() || null,
      orgInquiryId: inquiry.id,
    });
    if (assigned) {
      await attachContactToLead({
        leadId: assigned.leadId,
        name: contactName,
        email,
        phone: body.phone?.toString().trim(),
        role: "Beslutningstaker",
        isPrimary: true,
      });
      await notifySalesRep(assigned.salesRepId, {
        title: `Ny web-lead: ${companyName}`,
        body: `${contactName} fylte ut skjema p\u00e5 nettsiden.`,
        url: `/selger/leads/${assigned.leadId}`,
      });
    }
  } catch (err) {
    console.error("[sales/web-form] round-robin failed:", err);
  }

  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
