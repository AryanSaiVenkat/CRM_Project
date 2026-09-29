jest.mock("@/lib/prisma");

import { prisma } from "@/lib/prisma";
import { mockReset, type DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { contactService } from "@/lib/services/contact.service";
import { NotFoundError } from "@/lib/errors/app-error";

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const OWNER = { id: "owner-1", email: "o@test.dev", role: "OWNER" as const };

beforeEach(() => mockReset(prismaMock));

describe("contactService.getUnifiedView — FR-06", () => {
  it("throws NotFoundError when the contact is missing or out of scope", async () => {
    prismaMock.contact.findFirst.mockResolvedValue(null);
    await expect(contactService.getUnifiedView(OWNER, "missing")).rejects.toThrow(NotFoundError);
  });

  it("merges deals and tickets into one timeline sorted newest-first", async () => {
    const older = new Date("2026-01-01");
    const newer = new Date("2026-02-01");
    prismaMock.contact.findFirst.mockResolvedValue({
      id: "c1",
      lead: null,
      deals: [{ id: "d1", createdAt: older }],
      tickets: [{ id: "t1", createdAt: newer }],
    } as any);

    const view = await contactService.getUnifiedView(OWNER, "c1");

    expect(view.timeline.map((i) => i.id)).toEqual(["t1", "d1"]);
    expect(view.timeline[0].type).toBe("ticket");
    expect(view.timeline[1].type).toBe("deal");
  });
});
