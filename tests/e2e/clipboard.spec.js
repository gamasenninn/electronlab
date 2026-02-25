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

test("copies text to clipboard and confirms", async () => {
  await page.fill("#clipboard-input", "E2E test text");
  await page.click("#btn-clipboard-write");
  const result = await page.locator("#result-clipboard").textContent();
  expect(result).toContain('Copied to clipboard: "E2E test text"');
});

test("reads back clipboard content", async () => {
  await page.fill("#clipboard-input", "Roundtrip test");
  await page.click("#btn-clipboard-write");
  await page.click("#btn-clipboard-read");
  const result = await page.locator("#result-clipboard").textContent();
  expect(result).toContain("Roundtrip test");
});

test("uses default text when input is empty", async () => {
  await page.fill("#clipboard-input", "");
  await page.click("#btn-clipboard-write");
  const result = await page.locator("#result-clipboard").textContent();
  expect(result).toContain("Hello from Electron Lab!");
});

test("clipboard round-trip preserves exact text", async () => {
  const testText = "Special chars: @#$%^&*()";
  await page.fill("#clipboard-input", testText);
  await page.click("#btn-clipboard-write");
  await page.click("#btn-clipboard-read");
  const result = await page.locator("#result-clipboard").textContent();
  expect(result).toContain(testText);
});
