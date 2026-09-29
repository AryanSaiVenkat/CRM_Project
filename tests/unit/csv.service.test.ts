jest.mock("@/lib/services/lead.service", () => ({
  leadService: { create: jest.fn() },
}));

import { leadService } from "@/lib/services/lead.service";
import { csvService } from "@/lib/services/csv.service";

const OWNER = { id: "owner-1", email: "o@test.dev", role: "OWNER" as const };

describe("csvService.importLeads — FR-05", () => {
  beforeEach(() => {
    (leadService.create as jest.Mock).mockReset();
  });

  it("reports per-row success/failure without one bad row blocking the rest", async () => {
    (leadService.create as jest.Mock).mockImplementation(async (_user: unknown, input: { name: string }) => {
      if (input.name === "Explodes") throw new Error("db exploded");
      return { id: "x", ...input };
    });

    const csv = ["name,email", "Alice,alice@x.com", ",missing-name@x.com", "Explodes,bad@x.com"].join("\n");

    const summary = await csvService.importLeads(OWNER, csv);

    expect(summary.successCount).toBe(1);
    expect(summary.failureCount).toBe(2);
    expect(summary.errors.map((e) => e.row)).toEqual([3, 4]); // header is row 1
  });
});

describe("csvService.toCsv — FR-05 export", () => {
  it("stringifies rows in the given column order with a header", () => {
    const csv = csvService.toCsv([{ id: "1", name: "Ada" }], ["id", "name"]);
    expect(csv.split("\n")[0]).toBe("id,name");
    expect(csv).toContain("1,Ada");
  });
});
