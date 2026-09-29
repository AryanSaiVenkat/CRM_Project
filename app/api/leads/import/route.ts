import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { withErrorHandling } from "@/lib/errors/error-handler";
import { csvService } from "@/lib/services/csv.service";
import { ValidationError } from "@/lib/errors/app-error";

// FR-05 — bulk CSV import, per-row success/failure summary.
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ValidationError("A CSV file is required under the 'file' field");
  }
  const text = await file.text();
  const summary = await csvService.importLeads(user, text);
  return NextResponse.json(summary);
});
