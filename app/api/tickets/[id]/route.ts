import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { withErrorHandling } from "@/lib/errors/error-handler";
import { ticketService } from "@/lib/services/ticket.service";
import { updateTicketSchema } from "@/lib/validation/ticket.schema";

type Ctx = { params: { id: string } };

// Gap-fill — FR-04 only requires create + appear-on-unified-view, but a
// ticket that can never move OPEN -> RESOLVED doesn't match the domain.
export const PATCH = withErrorHandling<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { status } = updateTicketSchema.parse(await req.json());
  const ticket = await ticketService.updateStatus(user, params.id, status);
  return NextResponse.json(ticket);
});
