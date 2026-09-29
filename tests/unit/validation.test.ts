import { parsePagination } from "@/lib/validation/common.schema";
import { createLeadSchema, updateLeadSchema } from "@/lib/validation/lead.schema";
import { updateDealStageSchema } from "@/lib/validation/deal.schema";
import { createTicketSchema, updateTicketSchema } from "@/lib/validation/ticket.schema";

describe("common.schema — parsePagination", () => {
  it("defaults take/skip when absent", () => {
    expect(parsePagination(new URLSearchParams())).toEqual({ take: 50, skip: 0 });
  });

  it("coerces string query params to numbers", () => {
    expect(parsePagination(new URLSearchParams("take=10&skip=5"))).toEqual({ take: 10, skip: 5 });
  });

  it("rejects an out-of-range take", () => {
    expect(() => parsePagination(new URLSearchParams("take=9999"))).toThrow();
  });
});

describe("lead.schema", () => {
  it("requires a non-empty name", () => {
    expect(createLeadSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts a minimal valid lead and treats an empty email as absent", () => {
    const result = createLeadSchema.parse({ name: "Ada", email: "" });
    expect(result.email).toBeUndefined();
  });

  it("rejects a malformed email", () => {
    expect(createLeadSchema.safeParse({ name: "Ada", email: "not-an-email" }).success).toBe(false);
  });

  it("updateLeadSchema allows a partial payload", () => {
    expect(updateLeadSchema.safeParse({ status: "CONTACTED" }).success).toBe(true);
  });
});

describe("deal.schema", () => {
  it("accepts each valid stage", () => {
    for (const stage of ["NEW", "CONTACTED", "PROPOSAL", "WON", "LOST"]) {
      expect(updateDealStageSchema.safeParse({ stage }).success).toBe(true);
    }
  });

  it("rejects an invalid stage", () => {
    expect(updateDealStageSchema.safeParse({ stage: "ARCHIVED" }).success).toBe(false);
  });
});

describe("ticket.schema", () => {
  it("requires contactId to be a UUID", () => {
    expect(createTicketSchema.safeParse({ contactId: "not-a-uuid", subject: "s", body: "b" }).success).toBe(false);
  });

  it("accepts a valid ticket payload", () => {
    expect(
      createTicketSchema.safeParse({ contactId: "11111111-1111-1111-1111-111111111111", subject: "s", body: "b" })
        .success
    ).toBe(true);
  });

  it("updateTicketSchema requires a valid status", () => {
    expect(updateTicketSchema.safeParse({ status: "CLOSED" }).success).toBe(false);
    expect(updateTicketSchema.safeParse({ status: "RESOLVED" }).success).toBe(true);
  });
});
