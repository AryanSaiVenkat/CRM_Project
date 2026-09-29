jest.mock("@/lib/prisma");
jest.mock("@/lib/ai-client", () => ({
  getSentiment: jest.fn().mockResolvedValue({ label: "NEGATIVE", confidence: 0.8, source: "fallback" }),
}));

import { prisma } from "@/lib/prisma";
import { mockReset, type DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { ticketService } from "@/lib/services/ticket.service";
import { NotFoundError } from "@/lib/errors/app-error";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const OWNER = { id: "owner-1", email: "o@test.dev", role: "OWNER" as const };

beforeEach(() => mockReset(prismaMock));

describe("ticketService.create — FR-04 + FR-AI-02", () => {
  it("throws NotFoundError when the contact is missing or out of scope", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(null);
    await expect(ticketService.create(OWNER, { contactId: "missing", subject: "s", body: "b" })).rejects.toThrow(
      NotFoundError
    );
  });

  it("tags the ticket with sentiment from the AI client on submission", async () => {
    prismaMock.contact.findFirst.mockResolvedValue({ id: "c1" } as any);
    prismaMock.ticket.create.mockImplementation((({ data }: any) => Promise.resolve({ id: "t1", ...data })) as any);

    const ticket = await ticketService.create(OWNER, {
      contactId: "c1",
      subject: "Angry",
      body: "This is unacceptable.",
    });

    expect(ticket.sentiment).toBe("NEGATIVE");
    expect(prismaMock.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "OPEN", contact: { connect: { id: "c1" } } }) })
    );
  });
});

describe("ticketService.updateStatus", () => {
  it("throws NotFoundError for a ticket outside scope", async () => {
    prismaMock.ticket.findFirst.mockResolvedValue(null);
    await expect(ticketService.updateStatus(OWNER, "t1", "RESOLVED")).rejects.toThrow(NotFoundError);
  });

  it("updates status for an in-scope ticket", async () => {
    prismaMock.ticket.findFirst.mockResolvedValue({ id: "t1" } as any);
    prismaMock.ticket.update.mockResolvedValue({ id: "t1", status: "RESOLVED" } as any);
    const updated = await ticketService.updateStatus(OWNER, "t1", "RESOLVED");
    expect(updated.status).toBe("RESOLVED");
  });
});
