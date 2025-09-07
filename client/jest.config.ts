import type { Config } from "jest";

const config: Config = {
  // name displayed during tests
  displayName: "frontend",

  // simulates browser environment in jest
  // e.g., using document.querySelector in your tests
  testEnvironment: "jest-environment-jsdom",

  // jest does not recognise jsx files by default, so we use babel to transform any jsx files
  transform: {
    "^.+\\.(t|j)sx?$": "babel-jest",
  },

  // tells jest how to handle css/scss imports in your tests
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },

  // ignore all node_modules except styleMock (needed for css imports)
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  // only run these tests

  testMatch: ["<rootDir>/client/src/**/*.test.(js|jsx|ts|tsx)"],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: ["client/src/**"],
  coverageThreshold: {
    // TODO: Increase coverage threshold back to 100%
    // after adding more tests
    global: {
      lines: 90,
      functions: 90,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
};

export default config;
