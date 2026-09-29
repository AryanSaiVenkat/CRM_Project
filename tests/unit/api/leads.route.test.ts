jest.mock("@/lib/rbac", () => ({
  requireUser: jest.fn().mockResolvedValue({ id: "u1", email: "u@test.dev", role: "OWNER" }),
}));
jest.mock("@/lib/services/lead.service", () => ({ leadService: { list: jest.fn(), create: jest.fn() } }));

import { GET, POST } from "@/app/api/leads/route";
import { leadService } from "@/lib/services/lead.service";

describe("GET /api/leads", () => {
  it("returns paginated items as JSON", async () => {
    (leadService.list as jest.Mock).mockResolvedValue({ items: [{ id: "l1" }], total: 1 });
    const res = await GET(new Request("http://localhost/api/leads?take=10&skip=0"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ id: "l1" }], total: 1 });
  });

  it("returns CSV when format=csv is set — FR-05 export", async () => {
    (leadService.list as jest.Mock).mockResolvedValue({
      items: [
        {
          id: "l1",
          name: "Ada",
          email: "a@x.com",
          phone: null,
          source: "Referral",
          status: "NEW",
          aiScore: 50,
          createdAt: new Date("2026-01-01"),
        },
      ],
      total: 1,
    });
    const res = await GET(new Request("http://localhost/api/leads?format=csv"));
    expect(res.headers.get("content-type")).toContain("text/csv");
    const text = await res.text();
    expect(text.split("\n")[0]).toBe("id,name,email,phone,source,status,aiScore,createdAt");
  });
});

describe("POST /api/leads", () => {
  it("creates a lead from a valid body", async () => {
    (leadService.create as jest.Mock).mockResolvedValue({ id: "l1", name: "Ada" });
    const res = await POST(
      new Request("http://localhost/api/leads", { method: "POST", body: JSON.stringify({ name: "Ada" }) })
    );
    expect(res.status).toBe(201);
  });

  it("rejects an invalid body with 400", async () => {
    const res = await POST(new Request("http://localhost/api/leads", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
  });
});
