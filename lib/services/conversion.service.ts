import { prisma } from "@/lib/prisma";
import { NotFoundError, ConflictError } from "@/lib/errors/app-error";
import type { SessionUser } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";

export const conversionService = {
  // FR-02 — one-click Lead -> Contact + Deal conversion. Wrapped in a single
  // transaction so a failure partway through never leaves an orphaned,
  // half-converted Lead (the bug in the old /prospects/[id]/convert route,
  // which did the create and the status update as two separate awaits).
  async convertLead(user: SessionUser, leadId: string) {
    return prisma.$transaction(async (tx) => {
      const where: Prisma.LeadWhereInput = user.role === "STAFF" ? { ownerId: user.id } : {};
      const lead = await tx.lead.findFirst({ where: { id: leadId, ...where } });
      if (!lead) throw new NotFoundError("Lead not found");
      if (lead.status === "CONVERTED") throw new ConflictError("Lead has already been converted");

      const contact = await tx.contact.create({
        data: { leadId: lead.id, name: lead.name, email: lead.email, phone: lead.phone },
      });
      const deal = await tx.deal.create({
        data: {
          title: `${lead.name} — ${lead.source ?? "New"} Deal`,
          stage: "NEW",
          amount: 0,
          contactId: contact.id,
        },
      });
      await tx.lead.update({ where: { id: lead.id }, data: { status: "CONVERTED" } });

      return { contact, deal };
    });
  },
};
