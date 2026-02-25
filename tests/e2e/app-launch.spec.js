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

test("app launches and shows main window", async () => {
  const title = await page.title();
  expect(title).toBe("Electron Lab");
});

test("main window has correct dimensions", async () => {
  const windowState = await electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    const [width, height] = win.getSize();
    return { width, height, isVisible: win.isVisible() };
  });
  expect(windowState.width).toBeGreaterThanOrEqual(1000);
  expect(windowState.height).toBeGreaterThanOrEqual(600);
  expect(windowState.isVisible).toBe(true);
});

test("header displays app name", async () => {
  const headerText = await page.locator("header h1").textContent();
  expect(headerText).toBe("Electron Lab");
});

test("all 17 feature cards are present", async () => {
  const cards = page.locator(".card");
  await expect(cards).toHaveCount(17);
});

test("each card has a number badge", async () => {
  for (let i = 1; i <= 17; i++) {
    const badge = page.locator(`.card-number`).filter({ hasText: new RegExp(`^${i}$`) });
    await expect(badge).toBeVisible();
  }
});
