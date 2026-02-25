const { test, expect } = require("@playwright/test");
const { launchApp, closeApp } = require("./helpers/electron-app");

let electronApp;
let page;

/**
 * Helper: close all windows loading http/https URLs (browser windows).
 * The main window loads file:// so it is never matched.
 */
async function closeBrowserWindows(app) {
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows().forEach((w) => {
      const url = w.webContents.getURL();
      if (url.startsWith("http://") || url.startsWith("https://")) {
        w.close();
      }
    });
  });
}

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  await closeBrowserWindows(electronApp);
  await closeApp(electronApp);
});

test("card #12 is visible with correct title", async () => {
  const number = page.locator(".card-number").filter({ hasText: /^12$/ });
  await expect(number).toBeVisible();
  const title = page.locator(".card-title").filter({ hasText: "Web Browser" });
  await expect(title).toBeVisible();
});

test("URL input has default value", async () => {
  const input = page.locator("#browser-url");
  await expect(input).toHaveValue("https://example.com");
});

test("shows error for empty URL", async () => {
  await page.fill("#browser-url", "");
  await page.click("#btn-browser-open");

  const result = await page.locator("#result-browser").textContent();
  expect(result).toContain("Please enter a URL");
});

test("opens browser window on Open click", async () => {
  await page.fill("#browser-url", "https://example.com");

  const windowPromise = electronApp.waitForEvent("window");
  await page.click("#btn-browser-open");
  const childPage = await windowPromise;

  expect(childPage).toBeTruthy();

  await page.waitForFunction(() => {
    const el = document.getElementById("result-browser");
    return el && el.textContent.includes("Browser opened");
  });

  const result = await page.locator("#result-browser").textContent();
  expect(result).toContain("Browser opened");
  expect(result).toMatch(/ID: \d+/);
});

test("Get DOM returns HTML content", async () => {
  // Wait for the page to finish loading
  await page.waitForTimeout(3000);

  await page.click("#btn-browser-dom");

  await page.waitForFunction(
    () => {
      const el = document.getElementById("result-browser");
      return el && el.textContent.includes("<");
    },
    { timeout: 10000 }
  );

  const result = await page.locator("#result-browser").textContent();
  expect(result).toContain("<html");
});

test("Get DOM shows error when no browser window is open", async () => {
  await closeBrowserWindows(electronApp);
  await page.waitForTimeout(500);

  await page.click("#btn-browser-dom");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-browser");
    return el && el.textContent.includes("No browser window");
  });

  const result = await page.locator("#result-browser").textContent();
  expect(result).toContain("No browser window is open");
});

test("opening a new URL closes the previous browser window", async () => {
  // Open first window
  const windowPromise1 = electronApp.waitForEvent("window");
  await page.fill("#browser-url", "https://example.com");
  await page.click("#btn-browser-open");
  await windowPromise1;

  // Open second window (should close the first)
  const windowPromise2 = electronApp.waitForEvent("window");
  await page.click("#btn-browser-open");
  await windowPromise2;

  await page.waitForTimeout(500);

  // Count windows loading http/https (browser windows only)
  const count = await electronApp.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().filter((w) => {
      const url = w.webContents.getURL();
      return url.startsWith("http://") || url.startsWith("https://");
    }).length;
  });
  expect(count).toBe(1);
});
