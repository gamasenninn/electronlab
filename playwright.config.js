// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
});
