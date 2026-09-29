import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { leadService } from "../lib/services/lead.service";
import { conversionService } from "../lib/services/conversion.service";
import { ticketService } from "../lib/services/ticket.service";
import type { SessionUser } from "../lib/rbac";

// Reproducibility NFR (§4.3) — fixed seed so results are re-derivable.
faker.seed(42);

const prisma = new PrismaClient();

const LEAD_SOURCES = ["Website Inbound", "Referral", "Cold Outreach", "Webinar", "Trade Show", "LinkedIn"];

// Curated positive/negative/neutral bodies mixed with Faker text, so the
// seeded data can sanity-check the sentiment pipeline against known labels.
const CURATED_TICKETS: { subject: string; body: string }[] = [
  { subject: "Really unhappy with the delay", body: "This is unacceptable — we've been waiting for a fix for weeks and it's still broken. I'm frustrated and considering cancelling." },
  { subject: "Thanks for the quick turnaround", body: "Thank you so much, the team resolved this quickly and I really appreciate the effort. Excellent service!" },
  { subject: "Invoice question", body: "Can you clarify the line item on the latest invoice? Not urgent, just want to understand the breakdown." },
  { subject: "Still waiting on a response", body: "I'm still waiting for someone to get back to me. This is the second time I've had to follow up and it's getting frustrating." },
  { subject: "Great experience onboarding", body: "The onboarding call was great, the rep was helpful and answered all our questions perfectly." },
  { subject: "Feature request", body: "Would it be possible to add an export option? Not a complaint, just a suggestion for a future release." },
];

function randomTicketBody() {
  if (faker.datatype.boolean({ probability: 0.5 })) {
    return faker.helpers.arrayElement(CURATED_TICKETS);
  }
  return { subject: faker.lorem.sentence({ min: 3, max: 8 }), body: faker.lorem.paragraph() };
}

async function main() {
  console.log("Resetting demo data…");
  await prisma.ticket.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  // --- Users (FR-07) ---
  const owner = await prisma.user.create({
    data: { email: "owner@nexuscrmlite.test", passwordHash: await bcrypt.hash("demo1234", 10), role: "OWNER" },
  });
  const staff = await prisma.user.create({
    data: { email: "staff@nexuscrmlite.test", passwordHash: await bcrypt.hash("demo1234", 10), role: "STAFF" },
  });

  // Seeding calls the real services (not duplicated seed-only logic) so the
  // demo data satisfies the same invariants the app enforces at runtime —
  // conversion is a real transaction, scores/sentiment go through the real
  // AI client (ml-service if ML_SERVICE_URL is reachable, else fallback).
  const ownerUser: SessionUser = { id: owner.id, email: owner.email, role: "OWNER" };
  const staffUser: SessionUser = { id: staff.id, email: staff.email, role: "STAFF" };

  const LEAD_COUNT = 300;
  const STAGE_WEIGHTS: { weight: number; value: "NEW" | "CONTACTED" | "PROPOSAL" | "WON" | "LOST" }[] = [
    { weight: 4, value: "NEW" },
    { weight: 3, value: "CONTACTED" },
    { weight: 2, value: "PROPOSAL" },
    { weight: 2, value: "WON" },
    { weight: 1, value: "LOST" },
  ];

  let convertedCount = 0;
  let ticketCount = 0;

  for (let i = 0; i < LEAD_COUNT; i++) {
    const actingUser = i % 5 < 2 ? staffUser : ownerUser; // ~40% staff-owned, for FR-08 verification
    const hasEmail = faker.datatype.boolean({ probability: 0.85 });
    const hasPhone = faker.datatype.boolean({ probability: 0.7 });

    const lead = await leadService.create(actingUser, {
      name: faker.person.fullName(),
      email: hasEmail ? faker.internet.email().toLowerCase() : undefined,
      phone: hasPhone ? faker.phone.number() : undefined,
      source: faker.helpers.arrayElement(LEAD_SOURCES),
      status: "NEW",
    });

    if (!faker.datatype.boolean({ probability: 0.45 })) continue;

    const { contact, deal } = await conversionService.convertLead(actingUser, lead.id);
    convertedCount++;

    const stage = faker.helpers.weightedArrayElement(STAGE_WEIGHTS);
    if (stage !== "NEW") {
      await prisma.deal.update({ where: { id: deal.id }, data: { stage } });
    }

    const ticketN = faker.number.int({ min: 0, max: 3 });
    for (let j = 0; j < ticketN; j++) {
      const { subject, body } = randomTicketBody();
      await ticketService.create(actingUser, {
        contactId: contact.id,
        subject,
        body,
        status: faker.helpers.arrayElement(["OPEN", "RESOLVED"]),
      });
      ticketCount++;
    }
  }

  console.log(`Seeded ${LEAD_COUNT} leads, ${convertedCount} converted (contacts+deals), ${ticketCount} tickets, 2 users.`);
  console.log("Login:  owner@nexuscrmlite.test / demo1234   (OWNER)");
  console.log("        staff@nexuscrmlite.test / demo1234   (STAFF)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
