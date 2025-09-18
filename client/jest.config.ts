import type { Config } from "jest";

const config: Config = {
  displayName: "frontend",
  testEnvironment: "jest-environment-jsdom",
  transform: {
    // Jest does not recognise JSX and TS by default, so we use babel to transform them
    "^.+\\.(t|j)sx?$": "babel-jest",
  },
  // Stubs for non-JS imports (e.g., CSS, images)
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },

  // Ignore all node_modules except styleMock (needed for css imports)
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],
  testMatch: ["<rootDir>/src/**/*.test.(js|jsx|ts|tsx)"],

  // Coverage configuration
  // TODO: Reenable coverage once more tests are added
  collectCoverage: false,
  collectCoverageFrom: ["src/**"],
  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
};

export default config;
