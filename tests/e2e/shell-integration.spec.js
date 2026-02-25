const { test, expect } = require("@playwright/test");
const {
  launchApp,
  closeApp,
  mockOpenDialog,
  mockShellOpenExternal,
  mockShellOpenPath,
  mockShellShowItemInFolder,
} = require("./helpers/electron-app");

let electronApp;
let page;

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp(electronApp);
});

test("card #14 is visible with correct title", async () => {
  const number = page.locator(".card-number").filter({ hasText: /^14$/ });
  await expect(number).toBeVisible();
  const title = page.locator(".card-title").filter({ hasText: "Shell Integration" });
  await expect(title).toBeVisible();
});

test("opens URL in external browser", async () => {
  await mockShellOpenExternal(electronApp);

  await page.fill("#shell-url", "https://example.com");
  await page.click("#btn-shell-open-url");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-shell");
    return el && el.textContent.includes("Opened");
  });

  const result = await page.locator("#result-shell").textContent();
  expect(result).toContain("Opened");
  expect(result).toContain("https://example.com");

  // Verify the mock was called
  const calls = await electronApp.evaluate(() => global.__shellOpenExternalCalls);
  expect(calls).toContain("https://example.com");
});

test("shows error for empty URL", async () => {
  await page.fill("#shell-url", "");
  await page.click("#btn-shell-open-url");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-shell");
    return el && el.textContent.includes("Please enter");
  });

  const result = await page.locator("#result-shell").textContent();
  expect(result).toContain("Please enter");
});

test("opens a folder", async () => {
  await mockOpenDialog(electronApp, ["C:\\test-folder"]);
  await mockShellOpenPath(electronApp);

  await page.click("#btn-shell-open-folder");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-shell");
    return el && el.textContent.includes("Opened");
  });

  const result = await page.locator("#result-shell").textContent();
  expect(result).toContain("Opened");

  const calls = await electronApp.evaluate(() => global.__shellOpenPathCalls);
  expect(calls).toContain("C:\\test-folder");
});

test("shows item in folder", async () => {
  await mockOpenDialog(electronApp, ["C:\\test-folder\\file.txt"]);
  await mockShellShowItemInFolder(electronApp);

  await page.click("#btn-shell-show-folder");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-shell");
    return el && el.textContent.includes("Shown");
  });

  const result = await page.locator("#result-shell").textContent();
  expect(result).toContain("Shown");

  const calls = await electronApp.evaluate(() => global.__shellShowItemInFolderCalls);
  expect(calls).toContain("C:\\test-folder\\file.txt");
});

test("rejects disallowed URL protocol", async () => {
  await page.fill("#shell-url", "ftp://example.com");
  await page.click("#btn-shell-open-url");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-shell");
    return el && el.textContent.includes("not allowed");
  });

  const result = await page.locator("#result-shell").textContent();
  expect(result).toContain("not allowed");
});
