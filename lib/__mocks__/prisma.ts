import { mockDeep } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// Manual mock — jest.mock("@/lib/prisma") in a test file picks this up
// automatically. Mocking at the Prisma boundary (rather than mocking
// lib/repositories directly) means service AND repository code both run
// for real in unit tests, only the DB call itself is stubbed.
export const prisma = mockDeep<PrismaClient>();
