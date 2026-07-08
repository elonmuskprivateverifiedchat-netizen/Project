import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
  moduleNameMapper: {
    "^@workspace/db$": "<rootDir>/../../lib/db/src/index.ts",
    "^@workspace/db/schema$": "<rootDir>/../../lib/db/src/schema/index.ts",
    "^@workspace/api-zod$": "<rootDir>/../../lib/api-zod/src/index.ts",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          esModuleInterop: true,
          moduleResolution: "node",
        },
      },
    ],
  },
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/index.ts"],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  testTimeout: 15000,
  clearMocks: true,
};

export default config;
