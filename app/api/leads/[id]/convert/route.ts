import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { withErrorHandling } from "@/lib/errors/error-handler";
import { conversionService } from "@/lib/services/conversion.service";

type Ctx = { params: { id: string } };

// FR-02
export const POST = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const result = await conversionService.convertLead(user, params.id);
  return NextResponse.json(result, { status: 201 });
});
