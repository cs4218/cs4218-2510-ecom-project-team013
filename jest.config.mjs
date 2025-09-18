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
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: ["<rootDir>/**/*.test.(js|ts)"],

  // jest code coverage
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
