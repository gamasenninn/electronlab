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

test("sends notification with default values", async () => {
  await page.click("#btn-notif");
  const result = await page.locator("#result-notif").textContent();
  expect(result).toContain("Notification sent");
  expect(result).toContain("Hello!");
});

test("sends notification with custom title", async () => {
  await page.fill("#notif-title", "Custom Title");
  await page.fill("#notif-body", "Custom Body");
  await page.click("#btn-notif");
  const result = await page.locator("#result-notif").textContent();
  expect(result).toContain("Notification sent");
  expect(result).toContain("Custom Title");
});
