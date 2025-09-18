// @ts-check

/** @type {import("eslint").Linter.Config} */
const config = {
  extends: ["react-app", "react-app/jest"],
  rules: {
    // We do need to force a re-render in some tests
    "testing-library/no-unnecessary-act": "off",
  },
};

module.exports = config;
