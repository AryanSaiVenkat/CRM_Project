import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ValidationError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

// The handler you write can require ctx (e.g. destructure `{ params }`
// directly for a [id] route) since Next.js's runtime always supplies it for
// routes with a dynamic segment. The wrapped/exported function's ctx is
// optional in its type — routes with no dynamic segment (e.g. GET
// /api/leads) never receive or use one, and callers (including tests) may
// omit it entirely.
type InputHandler<C> = (req: Request, ctx: C) => Promise<Response>;
type WrappedHandler<C> = (req: Request, ctx?: C) => Promise<Response>;

// Wraps an App Router route handler so every thrown AppError/ZodError maps to
// a consistent JSON error response, instead of per-route try/catch boilerplate.
export function withErrorHandling<C = unknown>(handler: InputHandler<C>): WrappedHandler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx as C);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "Validation failed", details: err.flatten() }, { status: 400 });
      }
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
      }
      if (err instanceof AppError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      logger.error("Unhandled API error", { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
