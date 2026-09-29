import type { Prisma } from "@prisma/client";
import { contactRepository } from "@/lib/repositories/contact.repository";
import { NotFoundError } from "@/lib/errors/app-error";
import type { SessionUser } from "@/lib/rbac";

// Every Contact is created via conversionService with leadId set, so scoping
// through the Lead relation covers all real records (see plan notes).
function scopeWhere(user: SessionUser): Prisma.ContactWhereInput {
  return user.role === "STAFF" ? { lead: { ownerId: user.id } } : {};
}

export const contactService = {
  async list(user: SessionUser, opts: { take: number; skip: number }) {
    const where = scopeWhere(user);
    const [items, total] = await Promise.all([
      contactRepository.findMany(where, opts.take, opts.skip),
      contactRepository.count(where),
    ]);
    return { items, total };
  },

  // FR-06 — unified customer record: Lead (AI outputs), Deals, Tickets in one
  // chronological timeline. The flagship "no silos" screen.
  async getUnifiedView(user: SessionUser, id: string) {
    const contact = await contactRepository.findByIdUnified(id, scopeWhere(user));
    if (!contact) throw new NotFoundError("Contact not found");

    const timeline = [
      ...contact.deals.map((d) => ({ type: "deal" as const, id: d.id, createdAt: d.createdAt, data: d })),
      ...contact.tickets.map((t) => ({ type: "ticket" as const, id: t.id, createdAt: t.createdAt, data: t })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { contact, timeline };
  },
};
