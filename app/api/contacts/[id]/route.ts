import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { withErrorHandling } from "@/lib/errors/error-handler";
import { contactService } from "@/lib/services/contact.service";

type Ctx = { params: { id: string } };

// FR-06 — unified customer record view.
export const GET = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const view = await contactService.getUnifiedView(user, params.id);
  return NextResponse.json(view);
});
