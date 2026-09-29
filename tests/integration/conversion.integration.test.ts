/**
 * §10.2 integration test — Lead -> Contact -> Deal conversion end-to-end,
 * against a real Postgres database (no mocks). Requires the test DB from
 * docs/TESTING.md to be migrated and reachable.
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { conversionService } from "@/lib/services/conversion.service";
import { leadService } from "@/lib/services/lead.service";
import type { SessionUser } from "@/lib/rbac";
import { ConflictError, NotFoundError } from "@/lib/errors/app-error";

let owner: SessionUser;
let staff: SessionUser;

beforeAll(async () => {
  await prisma.ticket.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  const ownerRow = await prisma.user.create({
    data: { email: "it-owner@test.dev", passwordHash: await bcrypt.hash("x", 4), role: "OWNER" },
  });
  const staffRow = await prisma.user.create({
    data: { email: "it-staff@test.dev", passwordHash: await bcrypt.hash("x", 4), role: "STAFF" },
  });
  owner = { id: ownerRow.id, email: ownerRow.email, role: "OWNER" };
  staff = { id: staffRow.id, email: staffRow.email, role: "STAFF" };
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Lead -> Contact -> Deal conversion (FR-02) — real DB", () => {
  it("preserves name/email/phone with no data loss, sets Lead.status=CONVERTED, and creates one linked Contact + Deal", async () => {
    const lead = await leadService.create(owner, {
      name: "Integration Ada",
      email: "ada@integration.test",
      phone: "+1-555-0100",
      source: "Referral",
    });

    const { contact, deal } = await conversionService.convertLead(owner, lead.id);

    expect(contact.leadId).toBe(lead.id);
    expect(contact.name).toBe("Integration Ada");
    expect(contact.email).toBe("ada@integration.test");
    expect(contact.phone).toBe("+1-555-0100");
    expect(deal.contactId).toBe(contact.id);
    expect(deal.stage).toBe("NEW");

    const persistedLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(persistedLead.status).toBe("CONVERTED");

    const dealCount = await prisma.deal.count({ where: { contactId: contact.id } });
    expect(dealCount).toBe(1);
  });

  it("rejects a second conversion of the same lead with ConflictError, and does not create a second Contact/Deal", async () => {
    const lead = await leadService.create(owner, { name: "Once Only" });
    await conversionService.convertLead(owner, lead.id);

    await expect(conversionService.convertLead(owner, lead.id)).rejects.toThrow(ConflictError);

    const contactCount = await prisma.contact.count({ where: { leadId: lead.id } });
    expect(contactCount).toBe(1);
  });

  it("enforces FR-08 — a STAFF user cannot convert another owner's lead", async () => {
    const lead = await leadService.create(owner, { name: "Owner's Lead" });
    await expect(conversionService.convertLead(staff, lead.id)).rejects.toThrow(NotFoundError);
  });
});
