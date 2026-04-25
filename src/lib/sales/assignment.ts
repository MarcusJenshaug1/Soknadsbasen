import { prisma } from "@/lib/prisma";

export type LeadAssignmentResult = {
  leadId: string;
  salesRepId: string;
} | null;

/// Round-robin: pick the active sales rep with the oldest lastAssignedAt
/// (newest createdAt as tiebreaker), update pointer, create lead atomically.
/// Returns null if no active sales reps exist.
export async function assignLeadRoundRobin(args: {
  source: "inquiry" | "web_form" | "referral";
  companyName: string;
  title?: string;
  notes?: string | null;
  orgInquiryId?: string;
  expectedSeats?: number;
}): Promise<LeadAssignmentResult> {
  return prisma.$transaction(async (tx) => {
    const rep = await tx.salesRepProfile.findFirst({
      where: { status: "active" },
      orderBy: [{ lastAssignedAt: "asc" }, { createdAt: "asc" }],
      select: { userId: true },
    });
    if (!rep) return null;

    await tx.salesRepProfile.update({
      where: { userId: rep.userId },
      data: { lastAssignedAt: new Date() },
    });

    const lead = await tx.lead.create({
      data: {
        salesRepId: rep.userId,
        stage: "Ny",
        probability: 10,
        source: args.source,
        title: args.title ?? args.companyName,
        companyName: args.companyName,
        notes: args.notes ?? null,
        orgInquiryId: args.orgInquiryId ?? null,
        expectedSeats: args.expectedSeats ?? 1,
      },
      select: { id: true },
    });

    return { leadId: lead.id, salesRepId: rep.userId };
  });
}

export async function attachContactToLead(args: {
  leadId: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  isPrimary?: boolean;
  role?: string;
}) {
  const contact = await prisma.crmContact.create({
    data: {
      name: args.name,
      email: args.email ?? null,
      phone: args.phone ?? null,
      title: args.title ?? null,
    },
  });
  await prisma.leadContactLink.create({
    data: {
      leadId: args.leadId,
      contactId: contact.id,
      role: args.role ?? "Beslutningstaker",
      isPrimary: args.isPrimary ?? true,
    },
  });
  return contact;
}
