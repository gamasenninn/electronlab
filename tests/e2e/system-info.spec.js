const { test, expect } = require("@playwright/test");
const { launchApp, closeApp } = require("./helpers/electron-app");

let electronApp;
let page;

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp(electronApp);
});

test("displays system info on button click", async () => {
  await page.click("#btn-sysinfo");
  const result = await page.locator("#result-sysinfo").textContent();

  expect(result).toContain("platform:");
  expect(result).toContain("arch:");
  expect(result).toContain("nodeVersion:");
  expect(result).toContain("electronVersion:");
  expect(result).toContain("chromeVersion:");
  expect(result).toContain("cpus:");
  expect(result).toContain("totalMemory:");
  expect(result).toContain("freeMemory:");
  expect(result).toContain("hostname:");
  expect(result).toContain("homeDir:");
  expect(result).toContain("uptime:");
  expect(result).toContain("appVersion:");
  expect(result).toContain("appPath:");
});

test("platform matches current OS", async () => {
  await page.click("#btn-sysinfo");
  const result = await page.locator("#result-sysinfo").textContent();
  expect(result).toContain("platform: win32");
});

test("memory values include GB unit", async () => {
  await page.click("#btn-sysinfo");
  const result = await page.locator("#result-sysinfo").textContent();
  expect(result).toMatch(/totalMemory:.*GB/);
  expect(result).toMatch(/freeMemory:.*GB/);
});
