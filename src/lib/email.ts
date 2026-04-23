/**
 * Email service for password reset and other transactional emails.
 *
 * If SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS are set, uses Nodemailer.
 * Otherwise, logs the email to the console (dev mode).
 */

import nodemailer from "nodemailer";

const smtpConfigured =
  process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT!),
      secure: Number(process.env.SMTP_PORT!) === 465,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    })
  : null;

const FROM = process.env.SMTP_FROM || "CV Maker <noreply@cvmaker.local>";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  if (transporter) {
    await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`[Email] Sent "${subject}" to ${to}`);
  } else {
    console.log("\n╔══════════════════════════════════════════════════╗");
    console.log("║  DEV EMAIL (SMTP not configured)                ║");
    console.log("╚══════════════════════════════════════════════════╝");
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${html.replace(/<[^>]*>/g, "")}\n`);
  }
}

export function buildPasswordResetEmail(resetUrl: string, name?: string) {
  const greeting = name ? `Hei ${name}` : "Hei";
  return {
    subject: "Tilbakestill passord – CV Maker",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">${greeting},</h2>
        <p>Du har bedt om å tilbakestille passordet ditt. Klikk på knappen under for å sette et nytt passord:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Sett nytt passord
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Lenken utløper om 1 time. Hvis du ikke ba om dette, kan du ignorere denne meldingen.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">CV Maker</p>
      </div>
    `,
  };
}
