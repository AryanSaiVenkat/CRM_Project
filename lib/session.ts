import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type SessionUser = { id: string; email: string; role: "OWNER" | "STAFF" };

// Shared by API routes (via lib/rbac.ts#requireUser) and Server Components
// (the layout and each page call this directly and redirect on null).
// Wrapped in React's cache() so the layout + page both calling it in the
// same request render pass only hits next-auth/the DB once.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getServerSession(authOptions);
  const raw = session?.user as { id?: string; email?: string; role?: string } | undefined;
  if (!raw?.id || !raw.email || !raw.role) return null;
  return { id: raw.id, email: raw.email, role: raw.role === "STAFF" ? "STAFF" : "OWNER" };
});
