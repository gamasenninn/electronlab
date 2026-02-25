// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: ".",
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  retries: 0,
  reporter: "list",
});
