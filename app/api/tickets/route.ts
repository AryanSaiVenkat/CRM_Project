import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { withErrorHandling } from "@/lib/errors/error-handler";
import { ticketService } from "@/lib/services/ticket.service";
import { csvService } from "@/lib/services/csv.service";
import { createTicketSchema } from "@/lib/validation/ticket.schema";

export const dynamic = "force-dynamic";

// FR-04
export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const tickets = await ticketService.list(user);

  const url = new URL(req.url);
  if (url.searchParams.get("format") === "csv") {
    const csv = csvService.toCsv(
      tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        sentiment: t.sentiment ?? "",
        contact: t.contact.name,
        createdAt: t.createdAt.toISOString(),
      })),
      ["id", "subject", "status", "sentiment", "contact", "createdAt"]
    );
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=tickets.csv" },
    });
  }

  return NextResponse.json(tickets);
});

export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const input = createTicketSchema.parse(await req.json());
  const ticket = await ticketService.create(user, input);
  return NextResponse.json(ticket, { status: 201 });
});
