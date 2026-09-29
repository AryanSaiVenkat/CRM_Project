import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dealRepository = {
  findMany(where: Prisma.DealWhereInput) {
    return prisma.deal.findMany({
      where,
      include: { contact: true },
      orderBy: { createdAt: "asc" },
    });
  },
  findById(id: string, where: Prisma.DealWhereInput = {}) {
    return prisma.deal.findFirst({ where: { id, ...where } });
  },
  create(data: Prisma.DealCreateInput, tx: Prisma.TransactionClient = prisma) {
    return tx.deal.create({ data });
  },
  updateStage(id: string, stage: Prisma.DealUpdateInput["stage"]) {
    return prisma.deal.update({ where: { id }, data: { stage } });
  },
};
