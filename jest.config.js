const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

// Unit tests — mocked Prisma boundary (lib/__mocks__/prisma.ts), no real DB.
// §10.3 target: >=60% line coverage on core CRUD/API-route logic (not UI).
const customJestConfig = {
  testEnvironment: "node",
  // next/jest doesn't auto-derive this from tsconfig's "paths" without an
  // explicit "baseUrl" set — declared directly here instead.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/tests/integration/"],
  collectCoverageFrom: [
    "lib/services/**/*.ts",
    "lib/repositories/**/*.ts",
    "lib/validation/**/*.ts",
    "lib/ai-client.ts",
    "lib/errors/**/*.ts",
    "app/api/**/*.ts",
  ],
  coverageThreshold: {
    global: { lines: 60, statements: 60 },
  },
};

module.exports = createJestConfig(customJestConfig);
