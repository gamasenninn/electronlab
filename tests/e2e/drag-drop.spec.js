const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");
const { launchApp, closeApp } = require("./helpers/electron-app");

const FIXTURES_DIR = path.resolve(__dirname, "fixtures");
const SAMPLE_FILE = path.resolve(FIXTURES_DIR, "sample.txt");

let electronApp;
let page;

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp(electronApp);
});

test("drop zone is visible", async () => {
  const dropZone = page.locator("#drop-zone");
  await expect(dropZone).toBeVisible();
  await expect(dropZone).toContainText("Drop");
});

test("dragover adds .dragover class", async () => {
  const dropZone = page.locator("#drop-zone");

  await page.evaluate(() => {
    const dz = document.getElementById("drop-zone");
    const event = new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });
    dz.dispatchEvent(event);
  });

  await expect(dropZone).toHaveClass(/dragover/);
});

test("dragleave removes .dragover class", async () => {
  const dropZone = page.locator("#drop-zone");

  // First add dragover
  await page.evaluate(() => {
    const dz = document.getElementById("drop-zone");
    dz.dispatchEvent(
      new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      })
    );
  });
  await expect(dropZone).toHaveClass(/dragover/);

  // Then dragleave
  await page.evaluate(() => {
    const dz = document.getElementById("drop-zone");
    dz.dispatchEvent(
      new DragEvent("dragleave", {
        bubbles: true,
        cancelable: true,
      })
    );
  });

  await expect(dropZone).not.toHaveClass(/dragover/);
});

test("file drop shows file info and content", async () => {
  const sampleContent = fs.readFileSync(SAMPLE_FILE, "utf-8");
  const sampleStats = fs.statSync(SAMPLE_FILE);

  // Mock fs:readFile IPC at main process level since webUtils.getPathForFile
  // returns empty string for synthetic File objects created in page.evaluate
  await electronApp.evaluate(({ ipcMain }, { content }) => {
    ipcMain.removeHandler("fs:readFile");
    ipcMain.handle("fs:readFile", () => ({ success: true, content }));
  }, { content: sampleContent });

  await page.evaluate(
    ({ fileName, fileSize }) => {
      const dz = document.getElementById("drop-zone");
      const dt = new DataTransfer();

      const file = new File(["dummy"], fileName, { type: "text/plain" });
      Object.defineProperty(file, "size", { value: fileSize });
      dt.items.add(file);

      const event = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      dz.dispatchEvent(event);
    },
    {
      fileName: path.basename(SAMPLE_FILE),
      fileSize: sampleStats.size,
    }
  );

  // Wait for the result to be populated
  await page.waitForFunction(
    () => {
      const el = document.getElementById("result-drop");
      return el && el.textContent.includes("Name:");
    },
    { timeout: 5000 }
  );

  const result = await page.locator("#result-drop").textContent();

  // File info assertions
  expect(result).toContain("Name: sample.txt");
  expect(result).toContain("Size:");
  expect(result).toContain("bytes");

  // File content assertions
  expect(result).toContain("Content");
  expect(result).toContain("Hello from sample.txt");
  expect(result).toContain("test fixture");
});

test("drop zone loses .dragover class after drop", async () => {
  const dropZone = page.locator("#drop-zone");
  await expect(dropZone).not.toHaveClass(/dragover/);
});
