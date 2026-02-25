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
const SAMPLE_JS = path.resolve(FIXTURES_DIR, "sample.js");
const TEMP_DIR = path.resolve(FIXTURES_DIR, "temp");

let electronApp;
let page;

/**
 * Helper: close all editor windows (those loading editor.html).
 */
async function closeEditorWindows(app) {
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows().forEach((w) => {
      const url = w.webContents.getURL();
      if (url.includes("editor.html")) {
        w.close();
      }
    });
  });
}

/**
 * Helper: open editor window and return its page.
 */
async function openEditorWindow() {
  const windowPromise = electronApp.waitForEvent("window");
  await page.click("#btn-editor-open");
  const editorPage = await windowPromise;
  await editorPage.waitForLoadState("domcontentloaded");
  return editorPage;
}

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  await closeEditorWindows(electronApp);
  await closeApp(electronApp);
  // Clean up temp files
  const tempFiles = fs.readdirSync(TEMP_DIR).filter((f) => f !== ".gitkeep");
  for (const f of tempFiles) {
    fs.unlinkSync(path.join(TEMP_DIR, f));
  }
});

// --- Group A: Card visibility ---

test("card #15 is visible with correct title", async () => {
  const number = page.locator(".card-number").filter({ hasText: /^15$/ });
  await expect(number).toBeVisible();
  const title = page.locator(".card-title").filter({ hasText: "Monaco Editor" });
  await expect(title).toBeVisible();
});

// --- Group B: Editor window open/close ---

test("opens editor window on button click", async () => {
  const editorPage = await openEditorWindow();
  expect(editorPage).toBeTruthy();

  await page.waitForFunction(() => {
    const el = document.getElementById("result-editor");
    return el && el.textContent.includes("Editor opened");
  });

  const result = await page.locator("#result-editor").textContent();
  expect(result).toContain("Editor opened");
  expect(result).toMatch(/ID: \d+/);
});

test("editor window has Monaco Editor rendered", async () => {
  // Get the editor window page (should already be open from previous test)
  const windows = electronApp.windows();
  const editorPage = windows.find((w) => w.url().includes("editor.html"));
  expect(editorPage).toBeTruthy();

  // Wait for Monaco to initialize
  await editorPage.waitForFunction(
    () => document.querySelector("#editor-container .monaco-editor") !== null,
    { timeout: 15000 }
  );

  const monacoEl = editorPage.locator("#editor-container .monaco-editor");
  await expect(monacoEl).toBeVisible();
});

test("opening a new editor closes the previous one", async () => {
  await closeEditorWindows(electronApp);
  await page.waitForTimeout(500);

  // Open first editor
  const windowPromise1 = electronApp.waitForEvent("window");
  await page.click("#btn-editor-open");
  await windowPromise1;

  // Open second editor (should close the first)
  const windowPromise2 = electronApp.waitForEvent("window");
  await page.click("#btn-editor-open");
  await windowPromise2;

  await page.waitForTimeout(500);

  // Count editor windows
  const count = await electronApp.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().filter((w) => {
      return w.webContents.getURL().includes("editor.html");
    }).length;
  });
  expect(count).toBe(1);
});

// --- Group C: File open ---

test("Open File loads file content into editor", async () => {
  // Ensure editor is open
  await closeEditorWindows(electronApp);
  const editorPage = await openEditorWindow();

  // Wait for Monaco to be ready
  await editorPage.waitForFunction(
    () => window.monacoEditorInstance !== undefined,
    { timeout: 15000 }
  );

  // Mock open dialog with sample.js
  await mockOpenDialog(electronApp, [SAMPLE_JS]);
  await editorPage.click("#btn-editor-open-file");

  // Wait for content to be loaded
  await editorPage.waitForFunction(
    () => {
      return (
        window.monacoEditorInstance &&
        window.monacoEditorInstance.getValue().includes("greet")
      );
    },
    { timeout: 10000 }
  );

  const content = await editorPage.evaluate(() => {
    return window.monacoEditorInstance.getValue();
  });
  expect(content).toContain("function greet");
  expect(content).toContain("Hello,");
});

test("Open File cancel does not change editor content", async () => {
  const windows = electronApp.windows();
  const editorPage = windows.find((w) => w.url().includes("editor.html"));

  const contentBefore = await editorPage.evaluate(() => {
    return window.monacoEditorInstance.getValue();
  });

  await mockOpenDialogCancel(electronApp);
  await editorPage.click("#btn-editor-open-file");
  await editorPage.waitForTimeout(500);

  const contentAfter = await editorPage.evaluate(() => {
    return window.monacoEditorInstance.getValue();
  });
  expect(contentAfter).toBe(contentBefore);
});

test("opening .js file auto-detects javascript language", async () => {
  const windows = electronApp.windows();
  const editorPage = windows.find((w) => w.url().includes("editor.html"));

  // The previous test loaded sample.js, check language select
  const langValue = await editorPage.locator("#language-select").inputValue();
  expect(langValue).toBe("javascript");
});

// --- Group D: File save ---

test("Save writes editor content to disk", async () => {
  const windows = electronApp.windows();
  const editorPage = windows.find((w) => w.url().includes("editor.html"));

  const outputPath = path.resolve(TEMP_DIR, "editor-save-test.js");
  await mockSaveDialog(electronApp, outputPath);
  await editorPage.click("#btn-editor-save");

  // Wait for status to show saved
  await editorPage.waitForFunction(
    () => {
      const el = document.getElementById("editor-status");
      return el && el.textContent.toLowerCase().includes("saved");
    },
    { timeout: 10000 }
  );

  // Verify file on disk
  expect(fs.existsSync(outputPath)).toBe(true);
  const content = fs.readFileSync(outputPath, "utf-8");
  expect(content).toContain("function greet");
});

test("Save cancel does not produce error", async () => {
  const windows = electronApp.windows();
  const editorPage = windows.find((w) => w.url().includes("editor.html"));

  await mockSaveDialogCancel(electronApp);
  await editorPage.click("#btn-editor-save");
  await editorPage.waitForTimeout(500);

  // Status should not show error
  const status = await editorPage.locator("#editor-status").textContent();
  expect(status).not.toContain("Error");
});

// --- Group E: Language switching ---

test("changing language select updates editor language", async () => {
  const windows = electronApp.windows();
  const editorPage = windows.find((w) => w.url().includes("editor.html"));

  await editorPage.selectOption("#language-select", "python");

  const lang = await editorPage.evaluate(() => {
    const model = window.monacoEditorInstance.getModel();
    return model.getLanguageId();
  });
  expect(lang).toBe("python");
});
