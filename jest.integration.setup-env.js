// Runs before the test framework is installed — must run before any test
// file's module-level `new PrismaClient()` (lib/prisma.ts) picks up
// DATABASE_URL, so the real Prisma client points at the test DB, never dev.
process.env.DATABASE_URL = "postgresql://nexus:nexus_dev_password@localhost:5432/nexus_crm_lite_test";
