const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");
const {
  launchApp,
  closeApp,
  mockOpenDialog,
  mockOpenDialogCancel,
  mockSaveDialog,
  mockSaveDialogCancel,
} = require("./helpers/electron-app");

const FIXTURES_DIR = path.resolve(__dirname, "fixtures");
const SAMPLE_FILE = path.resolve(FIXTURES_DIR, "sample.txt");
const TEMP_DIR = path.resolve(FIXTURES_DIR, "temp");

let electronApp;
let page;

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp(electronApp);
  // Clean up temp files
  const tempFiles = fs.readdirSync(TEMP_DIR).filter((f) => f !== ".gitkeep");
  for (const f of tempFiles) {
    fs.unlinkSync(path.join(TEMP_DIR, f));
  }
});

test("reads a file and displays content", async () => {
  await mockOpenDialog(electronApp, [SAMPLE_FILE]);
  await page.click("#btn-file-read");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-file");
    return el && el.textContent.includes("File:");
  });

  const result = await page.locator("#result-file").textContent();
  expect(result).toContain("Hello from sample.txt");
  expect(result).toContain("test fixture");
});

test("shows canceled message when file read is canceled", async () => {
  await mockOpenDialogCancel(electronApp);
  await page.click("#btn-file-read");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-file");
    return el && el.textContent.includes("canceled");
  });

  const result = await page.locator("#result-file").textContent();
  expect(result).toContain("canceled");
});

test("writes a file and confirms", async () => {
  const outputPath = path.resolve(TEMP_DIR, "write-test.txt");
  await mockSaveDialog(electronApp, outputPath);
  await page.click("#btn-file-write");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-file");
    return el && el.textContent.includes("File written:");
  });

  const result = await page.locator("#result-file").textContent();
  expect(result).toContain("File written:");

  // Verify the file was actually created
  expect(fs.existsSync(outputPath)).toBe(true);
  const content = fs.readFileSync(outputPath, "utf-8");
  expect(content).toContain("Hello from Electron Lab!");
  expect(content).toContain("Written at:");
});

test("shows canceled message when file write is canceled", async () => {
  await mockSaveDialogCancel(electronApp);
  await page.click("#btn-file-write");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-file");
    return el && el.textContent.includes("canceled");
  });

  const result = await page.locator("#result-file").textContent();
  expect(result).toContain("canceled");
});

test("read then write round-trip", async () => {
  // Write a file
  const outputPath = path.resolve(TEMP_DIR, "roundtrip-test.txt");
  await mockSaveDialog(electronApp, outputPath);
  await page.click("#btn-file-write");
  await page.waitForFunction(() => {
    const el = document.getElementById("result-file");
    return el && el.textContent.includes("File written:");
  });

  // Read the file back
  await mockOpenDialog(electronApp, [outputPath]);
  await page.click("#btn-file-read");
  await page.waitForFunction(() => {
    const el = document.getElementById("result-file");
    return el && el.textContent.includes("Hello from Electron Lab!");
  });

  const result = await page.locator("#result-file").textContent();
  expect(result).toContain("Hello from Electron Lab!");
});
