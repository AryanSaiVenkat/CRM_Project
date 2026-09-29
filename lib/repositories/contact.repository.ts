import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const contactRepository = {
  findMany(where: Prisma.ContactWhereInput, take: number, skip: number) {
    return prisma.contact.findMany({ where, orderBy: { createdAt: "desc" }, take, skip });
  },
  count(where: Prisma.ContactWhereInput) {
    return prisma.contact.count({ where });
  },
  findById(id: string, where: Prisma.ContactWhereInput = {}) {
    return prisma.contact.findFirst({ where: { id, ...where } });
  },
  // FR-06 — unified record: lead (for AI score/drivers), deals, tickets.
  findByIdUnified(id: string, where: Prisma.ContactWhereInput = {}) {
    return prisma.contact.findFirst({
      where: { id, ...where },
      include: {
        lead: true,
        deals: { orderBy: { createdAt: "desc" } },
        tickets: { orderBy: { createdAt: "desc" } },
      },
    });
  },
  create(data: Prisma.ContactCreateInput, tx: Prisma.TransactionClient = prisma) {
    return tx.contact.create({ data });
  },
};
