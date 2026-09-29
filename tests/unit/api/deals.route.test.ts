jest.mock("@/lib/rbac", () => ({
  requireUser: jest.fn().mockResolvedValue({ id: "u1", email: "u@test.dev", role: "OWNER" }),
}));
jest.mock("@/lib/services/deal.service", () => ({ dealService: { list: jest.fn(), updateStage: jest.fn() } }));

import { GET } from "@/app/api/deals/route";
import { PATCH } from "@/app/api/deals/[id]/route";
import { dealService } from "@/lib/services/deal.service";

describe("GET /api/deals — FR-03", () => {
  it("returns the deal list", async () => {
    (dealService.list as jest.Mock).mockResolvedValue([{ id: "d1" }]);
    const res = await GET(new Request("http://localhost/api/deals"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "d1" }]);
  });
});

describe("PATCH /api/deals/:id — FR-03 move stage", () => {
  it("updates the stage on a valid payload", async () => {
    (dealService.updateStage as jest.Mock).mockResolvedValue({ id: "d1", stage: "WON" });
    const res = await PATCH(
      new Request("http://localhost/x", { method: "PATCH", body: JSON.stringify({ stage: "WON" }) }),
      { params: { id: "d1" } }
    );
    expect(res.status).toBe(200);
  });

  it("rejects an invalid stage with 400", async () => {
    const res = await PATCH(
      new Request("http://localhost/x", { method: "PATCH", body: JSON.stringify({ stage: "ARCHIVED" }) }),
      { params: { id: "d1" } }
    );
    expect(res.status).toBe(400);
  });
});
