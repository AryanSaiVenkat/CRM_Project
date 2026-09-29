/**
 * §10.2 integration test — ticket creation -> sentiment-tagging round trip
 * against a real Postgres database. Uses strongly-worded text so the
 * assertion holds whether ML_SERVICE_URL is live (real VADER) or not (the
 * local fallback keyword heuristic) — both agree on unambiguous language.
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { conversionService } from "@/lib/services/conversion.service";
import { leadService } from "@/lib/services/lead.service";
import { ticketService } from "@/lib/services/ticket.service";
import type { SessionUser } from "@/lib/rbac";

let owner: SessionUser;
let contactId: string;

beforeAll(async () => {
  await prisma.ticket.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  const ownerRow = await prisma.user.create({
    data: { email: "it-sentiment-owner@test.dev", passwordHash: await bcrypt.hash("x", 4), role: "OWNER" },
  });
  owner = { id: ownerRow.id, email: ownerRow.email, role: "OWNER" };

  const lead = await leadService.create(owner, { name: "Sentiment Test Contact" });
  const { contact } = await conversionService.convertLead(owner, lead.id);
  contactId = contact.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Ticket creation -> sentiment tagging (FR-04 + FR-AI-02) — real DB", () => {
  it("persists a NEGATIVE sentiment for clearly negative ticket text", async () => {
    const ticket = await ticketService.create(owner, {
      contactId,
      subject: "Very upset",
      body: "This is unacceptable, the service failed again and I am extremely frustrated. I want a refund and will cancel.",
    });

    expect(ticket.sentiment).toBe("NEGATIVE");

    const persisted = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(persisted.sentiment).toBe("NEGATIVE");
    expect(persisted.contactId).toBe(contactId);
  });

  it("persists a POSITIVE sentiment for clearly positive ticket text", async () => {
    const ticket = await ticketService.create(owner, {
      contactId,
      subject: "Thanks!",
      body: "Thank you so much, the team resolved this quickly and I really appreciate the excellent, wonderful service.",
    });

    expect(ticket.sentiment).toBe("POSITIVE");
  });

  it("appears on the contact's unified view (FR-06) immediately after creation", async () => {
    const before = await prisma.ticket.count({ where: { contactId } });
    await ticketService.create(owner, {
      contactId,
      subject: "Round trip",
      body: "Neutral update, no strong sentiment.",
    });
    const after = await prisma.ticket.count({ where: { contactId } });
    expect(after).toBe(before + 1);
  });
});
