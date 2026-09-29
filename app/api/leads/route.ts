import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { withErrorHandling } from "@/lib/errors/error-handler";
import { leadService } from "@/lib/services/lead.service";
import { csvService } from "@/lib/services/csv.service";
import { createLeadSchema, leadListQuerySchema } from "@/lib/validation/lead.schema";
import { parsePagination } from "@/lib/validation/common.schema";

export const dynamic = "force-dynamic"; // session-dependent, must not be statically prerendered

// FR-01
export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const { take, skip } = parsePagination(url.searchParams);
  const { status } = leadListQuerySchema.parse({ status: url.searchParams.get("status") ?? undefined });

  const { items, total } = await leadService.list(user, { take, skip, status });

  // FR-05 — export
  if (url.searchParams.get("format") === "csv") {
    const csv = csvService.toCsv(
      items.map((l) => ({
        id: l.id,
        name: l.name,
        email: l.email ?? "",
        phone: l.phone ?? "",
        source: l.source ?? "",
        status: l.status,
        aiScore: l.aiScore ?? "",
        createdAt: l.createdAt.toISOString(),
      })),
      ["id", "name", "email", "phone", "source", "status", "aiScore", "createdAt"]
    );
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=leads.csv" },
    });
  }

  return NextResponse.json({ items, total });
});

export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const input = createLeadSchema.parse(await req.json());
  const lead = await leadService.create(user, input);
  return NextResponse.json(lead, { status: 201 });
});
