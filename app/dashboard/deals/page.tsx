import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { dealService } from "@/lib/services/deal.service";
import DealPipelineClient from "@/components/deals/DealPipelineClient";

// FR-03
export default async function DealsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const deals = await dealService.list(user);

  return <DealPipelineClient initialDeals={deals} />;
}
