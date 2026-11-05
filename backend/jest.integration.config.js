module.exports = {
  testEnvironment: "node", clearMocks: true,
  setupFiles: ["<rootDir>/tests/integration-mode/setup.js"],
  testMatch: ["<rootDir>/tests/*.test.js"],
  testTimeout: 15000,
  // Explicit paths are required by the runner; no coverage claim for a selected suite.
  collectCoverage: false,
};
