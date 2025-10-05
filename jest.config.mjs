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
  testPathIgnorePatterns: ["coverage", "node_modules/", "<rootDir>/client/"],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    // "config/**",
    "controllers/**",
    "helpers/**",
    "middlewares/**",
    // "models/**",
    "routes/**",
  ],
  coveragePathIgnorePatterns: [
    "coverage",
    "node_modules/",
    "<rootDir>/client/",
  ],
  coverageThreshold: {
    global: {
      lines: 0,
      functions: 0,
    },
  },

  // To work with TS
  transform: {
    ...tsJestTransformCfg,
  },
};
