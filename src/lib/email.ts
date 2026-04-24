import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = "Søknadsbasen <noreply@xn--sknadsbasen-ggb.no>";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendMail({ to, subject, html, from }: SendMailOptions) {
  if (resend) {
    await resend.emails.send({ from: from ?? FROM, to, subject, html });
    console.log(`[Email] Sent "${subject}" to ${to}`);
  } else {
    console.log("\n╔══════════════════════════════════════════════════╗");
    console.log("║  DEV EMAIL (RESEND_API_KEY not configured)      ║");
    console.log("╚══════════════════════════════════════════════════╝");
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${html.replace(/<[^>]*>/g, "")}\n`);
  }
}

export function buildOrgInviteEmail(opts: {
  orgDisplayName: string;
  inviteUrl: string;
  inviterName?: string | null;
}): { subject: string; html: string } {
  const from = opts.inviterName
    ? `${opts.inviterName} via Søknadsbasen`
    : "Søknadsbasen";
  return {
    subject: `Du er invitert til ${opts.orgDisplayName} på Søknadsbasen`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #D5592E;">${from} inviterer deg</h2>
        <p>${opts.orgDisplayName} har invitert deg til å bli med som teammedlem på Søknadsbasen.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${opts.inviteUrl}" style="display: inline-block; padding: 12px 32px; background: #D5592E; color: #fff; text-decoration: none; border-radius: 100px; font-weight: 600;">
            Godta invitasjonen
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Lenken er gyldig i 7 dager. Logg inn eller opprett konto for å aktivere medlemskapet.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Søknadsbasen</p>
      </div>
    `,
  };
}

export function buildPasswordResetEmail(resetUrl: string, name?: string) {
  const greeting = name ? `Hei ${name}` : "Hei";
  return {
    subject: "Tilbakestill passord – Søknadsbasen",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #D5592E;">${greeting},</h2>
        <p>Du har bedt om å tilbakestille passordet ditt. Klikk på knappen under for å sette et nytt passord:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: #D5592E; color: #fff; text-decoration: none; border-radius: 100px; font-weight: 600;">
            Sett nytt passord
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Lenken utløper om 1 time. Hvis du ikke ba om dette, kan du ignorere denne meldingen.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Søknadsbasen</p>
      </div>
    `,
  };
}
