import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { contactService } from "@/lib/services/contact.service";
import { NotFoundError } from "@/lib/errors/app-error";
import ContactDetailClient from "@/components/contacts/ContactDetailClient";

// FR-06 — the flagship "no silos" screen: linked Deals, Tickets, and AI
// outputs (score, sentiment) in one chronological view.
export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  try {
    const view = await contactService.getUnifiedView(user, params.id);
    return <ContactDetailClient view={view} />;
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
}
