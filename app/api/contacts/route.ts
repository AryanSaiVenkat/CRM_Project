import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { withErrorHandling } from "@/lib/errors/error-handler";
import { contactService } from "@/lib/services/contact.service";
import { parsePagination } from "@/lib/validation/common.schema";

export const dynamic = "force-dynamic";

// Gap-fill — §8.3 has no explicit Contact list screen, but some navigation
// entry point into a Contact (the FR-06 flagship view) is unavoidable.
export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const { take, skip } = parsePagination(url.searchParams);
  const { items, total } = await contactService.list(user, { take, skip });
  return NextResponse.json({ items, total });
});
