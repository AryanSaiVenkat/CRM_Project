import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { withErrorHandling } from "@/lib/errors/error-handler";
import { dealService } from "@/lib/services/deal.service";
import { csvService } from "@/lib/services/csv.service";

export const dynamic = "force-dynamic";

// FR-03
export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireUser();
  const deals = await dealService.list(user);

  const url = new URL(req.url);
  if (url.searchParams.get("format") === "csv") {
    const csv = csvService.toCsv(
      deals.map((d) => ({
        id: d.id,
        title: d.title,
        stage: d.stage,
        amount: d.amount,
        contact: d.contact.name,
        createdAt: d.createdAt.toISOString(),
      })),
      ["id", "title", "stage", "amount", "contact", "createdAt"]
    );
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=deals.csv" },
    });
  }

  return NextResponse.json(deals);
});
