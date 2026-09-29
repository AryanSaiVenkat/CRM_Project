jest.mock("@/lib/prisma");

import { prisma } from "@/lib/prisma";
import { mockReset, type DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { conversionService } from "@/lib/services/conversion.service";
import { NotFoundError, ConflictError } from "@/lib/errors/app-error";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const OWNER = { id: "owner-1", email: "o@test.dev", role: "OWNER" as const };

beforeEach(() => {
  mockReset(prismaMock);
  // $transaction just invokes the callback with the same mock client — the
  // atomicity itself is a Prisma guarantee, not something to re-test here.
  prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
});

describe("conversionService.convertLead — FR-02", () => {
  it("throws NotFoundError when the lead is missing or out of scope", async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null);
    await expect(conversionService.convertLead(OWNER, "missing")).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when already converted", async () => {
    prismaMock.lead.findFirst.mockResolvedValue({ id: "l1", status: "CONVERTED" } as any);
    await expect(conversionService.convertLead(OWNER, "l1")).rejects.toThrow(ConflictError);
  });

  it("creates a Contact + Deal and marks the Lead CONVERTED, preserving all fields (no data loss)", async () => {
    const lead = { id: "l1", name: "Ada", email: "ada@x.com", phone: "123", source: "Referral", status: "NEW" };
    prismaMock.lead.findFirst.mockResolvedValue(lead as any);
    prismaMock.contact.create.mockResolvedValue({ ...lead, id: "c1" } as any);
    prismaMock.deal.create.mockResolvedValue({ id: "d1", title: "Ada — Referral Deal", stage: "NEW" } as any);
    prismaMock.lead.update.mockResolvedValue({} as any);

    const result = await conversionService.convertLead(OWNER, "l1");

    expect(prismaMock.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { leadId: "l1", name: "Ada", email: "ada@x.com", phone: "123" } })
    );
    expect(prismaMock.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ contactId: "c1", stage: "NEW", amount: 0 }) })
    );
    expect(prismaMock.lead.update).toHaveBeenCalledWith({ where: { id: "l1" }, data: { status: "CONVERTED" } });
    expect(result.contact.id).toBe("c1");
    expect(result.deal.id).toBe("d1");
  });
});
