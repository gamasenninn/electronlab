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

test("displays window info on button click", async () => {
  await page.click("#btn-window-info");
  const result = await page.locator("#result-window").textContent();

  expect(result).toContain("innerWidth");
  expect(result).toContain("innerHeight");
  expect(result).toContain("outerWidth");
  expect(result).toContain("outerHeight");
  expect(result).toContain("screenX");
  expect(result).toContain("screenY");
  expect(result).toContain("devicePixelRatio");
  expect(result).toContain("userAgent");
});

test("window info contains valid numeric dimensions", async () => {
  await page.click("#btn-window-info");
  const result = await page.locator("#result-window").textContent();
  const info = JSON.parse(result);

  expect(info.innerWidth).toBeGreaterThan(0);
  expect(info.innerHeight).toBeGreaterThan(0);
  expect(info.outerWidth).toBeGreaterThan(0);
  expect(info.outerHeight).toBeGreaterThan(0);
  expect(info.devicePixelRatio).toBeGreaterThan(0);
});

test("user agent contains Electron", async () => {
  await page.click("#btn-window-info");
  const result = await page.locator("#result-window").textContent();
  const info = JSON.parse(result);

  expect(info.userAgent).toContain("Electron");
});
