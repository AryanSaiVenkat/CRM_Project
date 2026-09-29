import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { withErrorHandling } from "@/lib/errors/error-handler";
import { leadService } from "@/lib/services/lead.service";
import { updateLeadSchema } from "@/lib/validation/lead.schema";

type Ctx = { params: { id: string } };

// FR-01 — full CRUD; §7.3's illustrative API table omits PATCH/DELETE but
// FR-01's own text and acceptance criterion require CRUD, so those are
// implemented here.
export const GET = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const lead = await leadService.getById(user, params.id);
  return NextResponse.json(lead);
});

export const PATCH = withErrorHandling<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const input = updateLeadSchema.parse(await req.json());
  const lead = await leadService.update(user, params.id, input);
  return NextResponse.json(lead);
});

export const DELETE = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await leadService.remove(user, params.id);
  return new NextResponse(null, { status: 204 });
});
