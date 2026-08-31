const nextJest = require("next/jest");

// `next/jest` wires up the same SWC transform Next uses, so our ESM `import`
// syntax and the `@/` path alias work in tests without extra Babel config.
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  // Only run our own test files, never Next's build output.
  testMatch: ["**/__tests__/**/*.test.js"],
  clearMocks: true,
  // Resolve the "@/..." alias (mirrors jsconfig.json paths).
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

module.exports = createJestConfig(config);
