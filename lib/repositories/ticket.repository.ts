import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const ticketRepository = {
  findMany(where: Prisma.TicketWhereInput) {
    return prisma.ticket.findMany({
      where,
      include: { contact: true },
      orderBy: { createdAt: "desc" },
    });
  },
  findById(id: string, where: Prisma.TicketWhereInput = {}) {
    return prisma.ticket.findFirst({ where: { id, ...where } });
  },
  create(data: Prisma.TicketCreateInput) {
    return prisma.ticket.create({ data });
  },
  updateStatus(id: string, status: Prisma.TicketUpdateInput["status"]) {
    return prisma.ticket.update({ where: { id }, data: { status } });
  },
};
