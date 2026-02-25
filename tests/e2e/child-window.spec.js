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

test("opens a child window on button click", async () => {
  const windowPromise = electronApp.waitForEvent("window");
  await page.click("#btn-child-window");
  const childPage = await windowPromise;

  // Verify child window opened
  expect(childPage).toBeTruthy();

  // Verify result text in main window
  const result = await page.locator("#result-child").textContent();
  expect(result).toContain("Child window opened");
  expect(result).toMatch(/ID: \d+/);
});

test("child window loads a data URL with content", async () => {
  const windowPromise = electronApp.waitForEvent("window");
  await page.click("#btn-child-window");
  const childPage = await windowPromise;

  // Verify the child window loaded a data URL
  const url = childPage.url();
  expect(url).toMatch(/^data:text\/html/);

  // Verify the child window properties via main process
  const childInfo = await electronApp.evaluate(({ BrowserWindow }) => {
    const windows = BrowserWindow.getAllWindows();
    const child = windows.find((w) => w.getParentWindow() !== null);
    if (!child) return null;
    const [width, height] = child.getSize();
    return { width, height, title: child.getTitle() };
  });
  expect(childInfo).not.toBeNull();
  expect(childInfo.width).toBe(400);
  expect(childInfo.height).toBe(300);
});

test("multiple child windows can be opened", async () => {
  const windowsBefore = await electronApp.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().length;
  });

  const windowPromise = electronApp.waitForEvent("window");
  await page.click("#btn-child-window");
  await windowPromise;

  const windowsAfter = await electronApp.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().length;
  });

  expect(windowsAfter).toBeGreaterThan(windowsBefore);
});
