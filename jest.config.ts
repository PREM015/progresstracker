import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  moduleDirectories: ["node_modules", "<rootDir>/"],

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  testPathIgnorePatterns: ["/node_modules/", "/.next/"],

  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
  ],
};

export default config;
