jest.mock("@/lib/rbac", () => ({
  requireUser: jest.fn().mockResolvedValue({ id: "u1", email: "u@test.dev", role: "OWNER" }),
}));
jest.mock("@/lib/services/lead.service", () => ({
  leadService: { getById: jest.fn(), update: jest.fn(), remove: jest.fn() },
}));

import { GET, PATCH, DELETE } from "@/app/api/leads/[id]/route";
import { leadService } from "@/lib/services/lead.service";
import { NotFoundError, ConflictError } from "@/lib/errors/app-error";

const ctx = { params: { id: "l1" } };

describe("GET /api/leads/:id", () => {
  it("returns the lead", async () => {
    (leadService.getById as jest.Mock).mockResolvedValue({ id: "l1" });
    const res = await GET(new Request("http://localhost/x"), ctx);
    expect(res.status).toBe(200);
  });

  it("maps NotFoundError to 404", async () => {
    (leadService.getById as jest.Mock).mockRejectedValue(new NotFoundError("Lead not found"));
    const res = await GET(new Request("http://localhost/x"), ctx);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/leads/:id", () => {
  it("updates the lead", async () => {
    (leadService.update as jest.Mock).mockResolvedValue({ id: "l1", status: "CONTACTED" });
    const res = await PATCH(
      new Request("http://localhost/x", { method: "PATCH", body: JSON.stringify({ status: "CONTACTED" }) }),
      ctx
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/leads/:id", () => {
  it("returns 204 on success", async () => {
    (leadService.remove as jest.Mock).mockResolvedValue(undefined);
    const res = await DELETE(new Request("http://localhost/x", { method: "DELETE" }), ctx);
    expect(res.status).toBe(204);
  });

  it("maps ConflictError to 409 (FR-02 data-loss guard)", async () => {
    (leadService.remove as jest.Mock).mockRejectedValue(new ConflictError("Already converted"));
    const res = await DELETE(new Request("http://localhost/x", { method: "DELETE" }), ctx);
    expect(res.status).toBe(409);
  });
});
