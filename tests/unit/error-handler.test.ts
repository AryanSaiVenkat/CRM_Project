import { z } from "zod";
import { withErrorHandling } from "@/lib/errors/error-handler";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors/app-error";

async function statusAndBody(res: Response) {
  return { status: res.status, body: await res.json() };
}

describe("withErrorHandling", () => {
  it("passes through a successful response unchanged", async () => {
    const handler = withErrorHandling(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const res = await handler(new Request("http://localhost/x"), {});
    expect(res.status).toBe(200);
  });

  it("maps NotFoundError to 404", async () => {
    const handler = withErrorHandling(async () => {
      throw new NotFoundError("Lead not found");
    });
    const { status, body } = await statusAndBody(await handler(new Request("http://localhost/x"), {}));
    expect(status).toBe(404);
    expect(body.error).toBe("Lead not found");
  });

  it("maps ConflictError to 409", async () => {
    const handler = withErrorHandling(async () => {
      throw new ConflictError("Already converted");
    });
    const { status } = await statusAndBody(await handler(new Request("http://localhost/x"), {}));
    expect(status).toBe(409);
  });

  it("maps ValidationError to 400 with details", async () => {
    const handler = withErrorHandling(async () => {
      throw new ValidationError("Bad input", { field: "name" });
    });
    const { status, body } = await statusAndBody(await handler(new Request("http://localhost/x"), {}));
    expect(status).toBe(400);
    expect(body.details).toEqual({ field: "name" });
  });

  it("maps a raw ZodError to 400", async () => {
    const schema = z.object({ name: z.string() });
    const handler = withErrorHandling(async () => {
      schema.parse({});
      return new Response();
    });
    const { status, body } = await statusAndBody(await handler(new Request("http://localhost/x"), {}));
    expect(status).toBe(400);
    expect(body.error).toBe("Validation failed");
  });

  it("maps an unexpected error to 500 without leaking internals", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("db connection string leaked");
    });
    const { status, body } = await statusAndBody(await handler(new Request("http://localhost/x"), {}));
    expect(status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});
