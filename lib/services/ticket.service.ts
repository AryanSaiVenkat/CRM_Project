import type { Prisma, TicketStatus } from "@prisma/client";
import { ticketRepository } from "@/lib/repositories/ticket.repository";
import { contactRepository } from "@/lib/repositories/contact.repository";
import { NotFoundError } from "@/lib/errors/app-error";
import { getSentiment } from "@/lib/ai-client";
import type { SessionUser } from "@/lib/rbac";
import type { CreateTicketInput } from "@/lib/validation/ticket.schema";

function scopeWhere(user: SessionUser): Prisma.TicketWhereInput {
  return user.role === "STAFF" ? { contact: { lead: { ownerId: user.id } } } : {};
}

function contactScope(user: SessionUser): Prisma.ContactWhereInput {
  return user.role === "STAFF" ? { lead: { ownerId: user.id } } : {};
}

export const ticketService = {
  // FR-04
  async list(user: SessionUser) {
    return ticketRepository.findMany(scopeWhere(user));
  },

  // FR-04 + FR-AI-02 — sentiment is tagged at submission time.
  async create(user: SessionUser, input: CreateTicketInput) {
    const contact = await contactRepository.findById(input.contactId, contactScope(user));
    if (!contact) throw new NotFoundError("Contact not found");

    const sentiment = await getSentiment(input.body);
    return ticketRepository.create({
      subject: input.subject,
      body: input.body,
      status: input.status ?? "OPEN",
      sentiment: sentiment.label,
      contact: { connect: { id: contact.id } },
    });
  },

  async updateStatus(user: SessionUser, id: string, status: TicketStatus) {
    const existing = await ticketRepository.findById(id, scopeWhere(user));
    if (!existing) throw new NotFoundError("Ticket not found");
    return ticketRepository.updateStatus(id, status);
  },
};
