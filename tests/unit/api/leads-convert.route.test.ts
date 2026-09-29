jest.mock("@/lib/rbac", () => ({
  requireUser: jest.fn().mockResolvedValue({ id: "u1", email: "u@test.dev", role: "OWNER" }),
}));
jest.mock("@/lib/services/conversion.service", () => ({ conversionService: { convertLead: jest.fn() } }));

import { POST } from "@/app/api/leads/[id]/convert/route";
import { conversionService } from "@/lib/services/conversion.service";
import { ConflictError } from "@/lib/errors/app-error";

const ctx = { params: { id: "l1" } };

describe("POST /api/leads/:id/convert — FR-02", () => {
  it("returns 201 with the created contact + deal", async () => {
    (conversionService.convertLead as jest.Mock).mockResolvedValue({ contact: { id: "c1" }, deal: { id: "d1" } });
    const res = await POST(new Request("http://localhost/x", { method: "POST" }), ctx);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ contact: { id: "c1" }, deal: { id: "d1" } });
  });

  it("maps a double-convert attempt to 409", async () => {
    (conversionService.convertLead as jest.Mock).mockRejectedValue(
      new ConflictError("Lead has already been converted")
    );
    const res = await POST(new Request("http://localhost/x", { method: "POST" }), ctx);
    expect(res.status).toBe(409);
  });
});
