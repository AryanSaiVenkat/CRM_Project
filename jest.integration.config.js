// §10.2 — integration tests against a real (Dockerized) Postgres, covering
// Lead -> Contact -> Deal conversion end-to-end and ticket creation ->
// sentiment-tagging round trip. Requires `docker compose up -d postgres`
// and the nexus_crm_lite_test database + migrations (see docs/TESTING.md).
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

const customJestConfig = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFiles: ["<rootDir>/jest.integration.setup-env.js"],
  testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
  testTimeout: 15000,
};

module.exports = createJestConfig(customJestConfig);
