jest.mock("@/lib/prisma");

import { prisma } from "@/lib/prisma";
import { mockReset, type DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { dealService } from "@/lib/services/deal.service";
import { NotFoundError } from "@/lib/errors/app-error";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const OWNER = { id: "owner-1", email: "o@test.dev", role: "OWNER" as const };
const STAFF = { id: "staff-1", email: "s@test.dev", role: "STAFF" as const };

beforeEach(() => mockReset(prismaMock));

describe("dealService.list — FR-08 scoping via Contact -> Lead -> owner", () => {
  it("does not scope for OWNER", async () => {
    prismaMock.deal.findMany.mockResolvedValue([]);
    await dealService.list(OWNER);
    expect(prismaMock.deal.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("scopes through contact.lead.ownerId for STAFF", async () => {
    prismaMock.deal.findMany.mockResolvedValue([]);
    await dealService.list(STAFF);
    expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { contact: { lead: { ownerId: STAFF.id } } } })
    );
  });
});

describe("dealService.updateStage — FR-03", () => {
  it("throws NotFoundError for a deal outside scope", async () => {
    prismaMock.deal.findFirst.mockResolvedValue(null);
    await expect(dealService.updateStage(STAFF, "d1", "WON")).rejects.toThrow(NotFoundError);
  });

  it("allows any stage -> any stage transition (no sequential state machine)", async () => {
    prismaMock.deal.findFirst.mockResolvedValue({ id: "d1", stage: "WON" } as any);
    prismaMock.deal.update.mockResolvedValue({ id: "d1", stage: "NEW" } as any);
    const updated = await dealService.updateStage(OWNER, "d1", "NEW");
    expect(updated.stage).toBe("NEW");
  });
});
