import { z } from "zod";

export const TICKET_STATUSES = ["OPEN", "RESOLVED"] as const;

// FR-04 — a ticket is logged against a Contact.
export const createTicketSchema = z.object({
  contactId: z.string().uuid(),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  body: z.string().trim().min(1, "Body is required").max(5000),
  status: z.enum(TICKET_STATUSES).optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
