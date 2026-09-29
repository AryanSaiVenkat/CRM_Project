import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const leadRepository = {
  findMany(where: Prisma.LeadWhereInput, take: number, skip: number) {
    return prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, take, skip });
  },
  count(where: Prisma.LeadWhereInput) {
    return prisma.lead.count({ where });
  },
  findById(id: string, where: Prisma.LeadWhereInput = {}) {
    return prisma.lead.findFirst({ where: { id, ...where }, include: { contact: true } });
  },
  create(data: Prisma.LeadCreateInput) {
    return prisma.lead.create({ data });
  },
  update(id: string, data: Prisma.LeadUpdateInput) {
    return prisma.lead.update({ where: { id }, data });
  },
  delete(id: string) {
    return prisma.lead.delete({ where: { id } });
  },
};
