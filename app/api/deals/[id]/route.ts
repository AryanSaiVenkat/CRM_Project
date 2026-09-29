import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { withErrorHandling } from "@/lib/errors/error-handler";
import { dealService } from "@/lib/services/deal.service";
import { updateDealStageSchema } from "@/lib/validation/deal.schema";

type Ctx = { params: { id: string } };

// FR-03 — move stage
export const PATCH = withErrorHandling<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { stage } = updateDealStageSchema.parse(await req.json());
  const deal = await dealService.updateStage(user, params.id, stage);
  return NextResponse.json(deal);
});
