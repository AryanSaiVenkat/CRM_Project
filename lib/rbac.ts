import { getSessionUser, type SessionUser } from "@/lib/session";
import { UnauthorizedError } from "@/lib/errors/app-error";

export type { SessionUser };

// FR-07 — resolves and validates the authenticated caller for an API route
// handler (throws, unlike getSessionUser which pages use with a redirect).
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
