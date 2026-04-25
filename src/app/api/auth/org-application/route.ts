import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase/server";

interface OrgApplicationBody {
  orgName: string;
  orgNumber?: string;
  contactName: string;
  contactEmail: string;
  message?: string;
}

export async function POST(req: Request) {
  let body: OrgApplicationBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const { orgName, orgNumber, contactName, contactEmail, message } = body;

  // Validate required fields
  if (!orgName?.trim() || !contactName?.trim() || !contactEmail?.trim()) {
    return NextResponse.json(
      { error: "Mangler påkrevde felt" },
      { status: 400 }
    );
  }

  const cleanEmail = contactEmail.trim().toLowerCase();
  const cleanOrgNumber = orgNumber?.replace(/[\s\-]/g, "") || null;

  try {
    // Create OrgInquiry
    const inquiry = await prisma.orgInquiry.create({
      data: {
        orgName: orgName.trim(),
        contactName: contactName.trim(),
        contactEmail: cleanEmail,
        message: message?.trim() || null,
      },
    });

    // Create temporary user account in Supabase Auth (no password required for org flow)
    const supabase = await supabaseAdmin();
    let userId: string | null = null;

    try {
      // Try to create a user without password (they'll verify email first)
      const authRes = await supabase.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: false,
        user_metadata: {
          name: contactName.trim(),
          isAdmin: false,
        },
      });
      userId = authRes.data?.user?.id ?? null;
    } catch (authError: any) {
      // User might already exist, get their ID
      const existingUser = await supabase.auth.admin.getUserById(cleanEmail);
      userId = existingUser.data?.user?.id ?? null;
      if (!userId) {
        console.error("Auth user creation failed:", authError);
      }
    }

    // Create app-level user profile if needed
    if (userId) {
      await prisma.user.upsert({
        where: { email: cleanEmail },
        update: { name: contactName.trim() },
        create: {
          id: userId,
          email: cleanEmail,
          name: contactName.trim(),
          isAdmin: false,
        },
      });
    }

    // Send confirmation email
    const confirmLink = `${process.env.NEXT_PUBLIC_SITE_URL}/logg-inn?email=${encodeURIComponent(cleanEmail)}`;

    await sendMail({
      to: cleanEmail,
      subject: "Bekreft organisasjonssøknaden din",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #D5592E;">Takk for søknaden!</h2>
          <p>Vi har mottatt søknaden din for organisasjonkonto.</p>
          <p>Vårt team vil gjennomgå søknaden og ta kontakt med deg snart.</p>
          <p style="margin-top: 24px;">
            <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background-color: #D5592E; color: white; text-decoration: none; border-radius: 24px; font-weight: 500;">Gå til søknadsbasen</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Søknadsbasen</p>
        </div>
      `,
    });

    // Send admin notification
    const adminEmail = process.env.ADMIN_EMAIL ?? "marcus@redi.as";
    await sendMail({
      to: adminEmail,
      subject: `Ny organisasjonssøknad: ${orgName.trim()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #D5592E;">Ny organisasjonssøknad</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 140px;">Organisasjon</td><td style="font-weight: 600;">${orgName.trim()}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Kontaktperson</td><td>${contactName.trim()}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">E-post</td><td><a href="mailto:${cleanEmail}">${cleanEmail}</a></td></tr>
            ${message?.trim() ? `<tr><td style="padding: 6px 0; color: #888; font-size: 13px; vertical-align: top;">Melding</td><td style="white-space: pre-wrap;">${message.trim()}</td></tr>` : ""}
          </table>
          <p style="margin: 0;"><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin" style="color: #D5592E;">Se søknadene →</a></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Søknadsbasen</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, inquiryId: inquiry.id });
  } catch (error) {
    console.error("Org application error:", error);
    return NextResponse.json(
      { error: "Noe gikk galt. Prøv igjen." },
      { status: 500 }
    );
  }
}
