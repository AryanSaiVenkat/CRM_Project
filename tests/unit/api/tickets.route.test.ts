jest.mock("@/lib/rbac", () => ({
  requireUser: jest.fn().mockResolvedValue({ id: "u1", email: "u@test.dev", role: "OWNER" }),
}));
jest.mock("@/lib/services/ticket.service", () => ({
  ticketService: { list: jest.fn(), create: jest.fn(), updateStatus: jest.fn() },
}));

import { GET, POST } from "@/app/api/tickets/route";
import { PATCH } from "@/app/api/tickets/[id]/route";
import { ticketService } from "@/lib/services/ticket.service";

describe("GET /api/tickets — FR-04", () => {
  it("returns the ticket list", async () => {
    (ticketService.list as jest.Mock).mockResolvedValue([{ id: "t1" }]);
    const res = await GET(new Request("http://localhost/api/tickets"));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/tickets — FR-04 + FR-AI-02", () => {
  it("creates a ticket from a valid body", async () => {
    (ticketService.create as jest.Mock).mockResolvedValue({ id: "t1", sentiment: "NEGATIVE" });
    const res = await POST(
      new Request("http://localhost/x", {
        method: "POST",
        body: JSON.stringify({ contactId: "11111111-1111-1111-1111-111111111111", subject: "s", body: "b" }),
      })
    );
    expect(res.status).toBe(201);
  });

  it("rejects a payload missing contactId with 400", async () => {
    const res = await POST(
      new Request("http://localhost/x", { method: "POST", body: JSON.stringify({ subject: "s", body: "b" }) })
    );
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/tickets/:id", () => {
  it("updates the ticket status", async () => {
    (ticketService.updateStatus as jest.Mock).mockResolvedValue({ id: "t1", status: "RESOLVED" });
    const res = await PATCH(
      new Request("http://localhost/x", { method: "PATCH", body: JSON.stringify({ status: "RESOLVED" }) }),
      { params: { id: "t1" } }
    );
    expect(res.status).toBe(200);
  });
});
