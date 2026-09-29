jest.mock("@/lib/rbac", () => ({
  requireUser: jest.fn().mockResolvedValue({ id: "u1", email: "u@test.dev", role: "OWNER" }),
}));
jest.mock("@/lib/services/csv.service", () => ({ csvService: { importLeads: jest.fn() } }));

import { POST } from "@/app/api/leads/import/route";
import { csvService } from "@/lib/services/csv.service";

describe("POST /api/leads/import — FR-05", () => {
  it("returns the import summary for a valid CSV file", async () => {
    (csvService.importLeads as jest.Mock).mockResolvedValue({ successCount: 2, failureCount: 0, errors: [] });
    const form = new FormData();
    form.append("file", new File(["name,email\nAda,a@x.com\n"], "leads.csv", { type: "text/csv" }));
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: form }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ successCount: 2, failureCount: 0, errors: [] });
  });

  it("rejects a request with no file field", async () => {
    const form = new FormData();
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: form }));
    expect(res.status).toBe(400);
  });
});
