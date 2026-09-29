import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ticketService } from "@/lib/services/ticket.service";
import TicketListClient from "@/components/tickets/TicketListClient";

// FR-04
export default async function TicketsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const tickets = await ticketService.list(user);

  return <TicketListClient initialTickets={tickets} />;
}
