import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { leadService } from "@/lib/services/lead.service";
import LeadListClient from "@/components/leads/LeadListClient";

// FR-01
export default async function LeadsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { items, total } = await leadService.list(user, { take: 100, skip: 0 });

  return <LeadListClient initialItems={items} initialTotal={total} />;
}
