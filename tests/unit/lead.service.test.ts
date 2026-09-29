jest.mock("@/lib/prisma");
jest.mock("@/lib/ai-client", () => ({
  scoreLead: jest.fn().mockResolvedValue({ score: 42, topDrivers: ["mock driver"], source: "fallback" }),
}));

import { prisma } from "@/lib/prisma";
import { mockReset, type DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { leadService } from "@/lib/services/lead.service";
import { NotFoundError, ConflictError } from "@/lib/errors/app-error";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const OWNER = { id: "owner-1", email: "owner@test.dev", role: "OWNER" as const };
const STAFF = { id: "staff-1", email: "staff@test.dev", role: "STAFF" as const };

beforeEach(() => mockReset(prismaMock));

describe("leadService.list", () => {
  it("does not scope by owner for OWNER role", async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);
    prismaMock.lead.count.mockResolvedValue(0);
    await leadService.list(OWNER, { take: 10, skip: 0 });
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("scopes to ownerId for STAFF role — FR-08", async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);
    prismaMock.lead.count.mockResolvedValue(0);
    await leadService.list(STAFF, { take: 10, skip: 0 });
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: STAFF.id } }));
  });
});

describe("leadService.create", () => {
  it("persists the AI score/drivers returned by the AI client and connects the owner", async () => {
    prismaMock.lead.create.mockImplementation((({ data }: any) => Promise.resolve({ id: "lead-1", ...data })) as any);
    const lead = await leadService.create(OWNER, { name: "Ada Lovelace", source: "Referral" });
    expect(lead.aiScore).toBe(42);
    expect(lead.aiTopDrivers).toEqual(["mock driver"]);
    expect(prismaMock.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ owner: { connect: { id: OWNER.id } } }) })
    );
  });
});

describe("leadService.remove", () => {
  it("throws NotFoundError when the lead doesn't exist or is out of scope", async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null);
    await expect(leadService.remove(OWNER, "missing")).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when the lead has already converted (FR-02 data-loss guard)", async () => {
    prismaMock.lead.findFirst.mockResolvedValue({ id: "lead-1", contact: { id: "contact-1" } } as any);
    await expect(leadService.remove(OWNER, "lead-1")).rejects.toThrow(ConflictError);
  });

  it("deletes an unconverted lead", async () => {
    prismaMock.lead.findFirst.mockResolvedValue({ id: "lead-1", contact: null } as any);
    prismaMock.lead.delete.mockResolvedValue({} as any);
    await leadService.remove(OWNER, "lead-1");
    expect(prismaMock.lead.delete).toHaveBeenCalledWith({ where: { id: "lead-1" } });
  });
});

describe("leadService.update", () => {
  it("throws NotFoundError for a lead outside the caller's scope", async () => {
    prismaMock.lead.findFirst.mockResolvedValue(null);
    await expect(leadService.update(STAFF, "other-owner-lead", { name: "X" })).rejects.toThrow(NotFoundError);
  });

  it("re-scores and updates an in-scope lead", async () => {
    prismaMock.lead.findFirst.mockResolvedValue({
      id: "lead-1",
      name: "Old",
      email: null,
      phone: null,
      source: null,
      status: "NEW",
      createdAt: new Date(),
    } as any);
    prismaMock.lead.update.mockImplementation((({ data }: any) => Promise.resolve({ id: "lead-1", ...data })) as any);
    const updated = await leadService.update(OWNER, "lead-1", { status: "CONTACTED" });
    expect(updated.aiScore).toBe(42);
  });
});
