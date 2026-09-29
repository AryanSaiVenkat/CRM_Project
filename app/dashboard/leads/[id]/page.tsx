import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { leadService } from "@/lib/services/lead.service";
import { NotFoundError } from "@/lib/errors/app-error";
import LeadDetailClient from "@/components/leads/LeadDetailClient";

// FR-01 — lead detail, with AI score + top drivers shown inline (§8.3)
export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  try {
    const lead = await leadService.getById(user, params.id);
    return <LeadDetailClient lead={lead} />;
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
}
