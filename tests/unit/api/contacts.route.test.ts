jest.mock("@/lib/rbac", () => ({
  requireUser: jest.fn().mockResolvedValue({ id: "u1", email: "u@test.dev", role: "OWNER" }),
}));
jest.mock("@/lib/services/contact.service", () => ({
  contactService: { list: jest.fn(), getUnifiedView: jest.fn() },
}));

import { GET as listContacts } from "@/app/api/contacts/route";
import { GET as getContact } from "@/app/api/contacts/[id]/route";
import { contactService } from "@/lib/services/contact.service";
import { NotFoundError } from "@/lib/errors/app-error";

describe("GET /api/contacts", () => {
  it("returns paginated contacts", async () => {
    (contactService.list as jest.Mock).mockResolvedValue({ items: [{ id: "c1" }], total: 1 });
    const res = await listContacts(new Request("http://localhost/api/contacts"));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/contacts/:id — FR-06 unified view", () => {
  it("returns the unified contact view", async () => {
    (contactService.getUnifiedView as jest.Mock).mockResolvedValue({ contact: { id: "c1" }, timeline: [] });
    const res = await getContact(new Request("http://localhost/x"), { params: { id: "c1" } });
    expect(res.status).toBe(200);
  });

  it("maps NotFoundError to 404", async () => {
    (contactService.getUnifiedView as jest.Mock).mockRejectedValue(new NotFoundError("Contact not found"));
    const res = await getContact(new Request("http://localhost/x"), { params: { id: "missing" } });
    expect(res.status).toBe(404);
  });
});
