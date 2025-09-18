// @ts-check
import { createDefaultEsmPreset } from "ts-jest";

/** @type {import("ts-jest").TsJestTransformerOptions} */
const tsJestOptions = {
  // Only transpile, skip type-checking for performance
  transpilation: true,
};
const tsJestTransformCfg = createDefaultEsmPreset(tsJestOptions).transform;

/** @type {import("jest").Config} */
export default {
  displayName: "backend",
  testEnvironment: "node",

  testMatch: ["<rootDir>/**/*.test.(js|ts)"],
  // Ignore frontend folder from backend tests
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/client/"],

  // Coverage configuration
  // TODO: Reenable coverage once more tests are added
  collectCoverage: false,
  collectCoverageFrom: ["controllers/**"],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },

  // To work with TS
  transform: {
    ...tsJestTransformCfg,
  },
};
