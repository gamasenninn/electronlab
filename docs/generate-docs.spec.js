const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");
const { launchApp, closeApp } = require("../tests/e2e/helpers/electron-app");

const SCREENSHOTS_DIR = path.resolve(__dirname, "screenshots");
const TEMP_DIR = path.resolve(__dirname, "..", "tests", "e2e", "fixtures", "temp");
const SAMPLE_JS = path.resolve(__dirname, "..", "tests", "e2e", "fixtures", "sample.js");
const TEST_DB = path.resolve(TEMP_DIR, "docs-test.db");

let electronApp;
let page;

test.describe("Generate documentation screenshots", () => {
  test.beforeAll(async () => {
    ({ electronApp, page } = await launchApp());
    // Ensure screenshots directory exists
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
  });

  test.afterAll(async () => {
    // Close all child windows
    await electronApp.evaluate(({ BrowserWindow }) => {
      const main = BrowserWindow.getAllWindows().find((w) =>
        w.webContents.getURL().includes("index.html")
      );
      BrowserWindow.getAllWindows().forEach((w) => {
        if (w !== main) w.close();
      });
    });
    await closeApp(electronApp);
    // Clean up temp DB
    if (fs.existsSync(TEST_DB)) {
      try {
        fs.unlinkSync(TEST_DB);
      } catch {
        // ignore
      }
    }
  });

  test("main overview", async () => {
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "main-overview.png"),
      fullPage: true,
    });

    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, "main-overview.png"))).toBe(true);
  });

  test("#12 Web Browser", async () => {
    const dataUrl =
      "data:text/html," +
      encodeURIComponent(
        [
          "<!DOCTYPE html>",
          '<html><head><meta charset="utf-8">',
          "<title>Electron Lab - Web Browser Demo</title>",
          "<style>",
          "  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif;",
          "         margin: 40px; background: #f5f5f5; }",
          "  h1 { color: #2563eb; }",
          "  .card { background: white; border-radius: 8px; padding: 24px;",
          "          box-shadow: 0 2px 8px rgba(0,0,0,.1); max-width: 600px; }",
          "  ul { line-height: 1.8; }",
          "</style></head><body>",
          '<div class="card">',
          "  <h1>Web Browser Demo</h1>",
          "  <p>This page is loaded inside an Electron BrowserWindow.</p>",
          "  <ul>",
          "    <li>Rendered using Chromium engine</li>",
          "    <li>Loaded via <code>BrowserWindow.loadURL()</code></li>",
          "    <li>Supports full HTML/CSS/JS</li>",
          "  </ul>",
          "</div></body></html>",
        ].join("")
      );

    await page.fill("#browser-url", dataUrl);

    const windowPromise = electronApp.waitForEvent("window");
    await page.click("#btn-browser-open");
    const browserPage = await windowPromise;

    // Wait for content to render
    await browserPage.waitForLoadState("domcontentloaded");
    await browserPage.waitForFunction(
      () => document.querySelector("h1") !== null,
      { timeout: 10000 }
    );

    await browserPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "web-browser.png"),
    });

    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, "web-browser.png"))).toBe(true);

    // Close browser window
    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows().forEach((w) => {
        const url = w.webContents.getURL();
        if (url.startsWith("data:")) w.close();
      });
    });
  });

  test("#15 Monaco Editor", async () => {
    // Open editor
    const windowPromise = electronApp.waitForEvent("window");
    await page.click("#btn-editor-open");
    const editorPage = await windowPromise;
    await editorPage.waitForLoadState("domcontentloaded");

    // Wait for Monaco to initialize
    await editorPage.waitForFunction(
      () => window.monacoEditorInstance !== undefined,
      { timeout: 15000 }
    );

    // Mock open dialog and load sample.js
    await electronApp.evaluate(({ dialog }, paths) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: paths,
      });
    }, [SAMPLE_JS]);

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

    // Wait a moment for syntax highlighting to fully render
    await editorPage.waitForTimeout(1000);

    await editorPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "monaco-editor.png"),
    });

    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, "monaco-editor.png"))).toBe(true);

    // Close editor window
    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows().forEach((w) => {
        if (w.webContents.getURL().includes("editor.html")) w.close();
      });
    });
  });

  test("#17 SQLite Database", async () => {
    // Open SQL Console
    const windowPromise = electronApp.waitForEvent("window");
    await page.click("#btn-db-console");
    const sqlitePage = await windowPromise;
    await sqlitePage.waitForLoadState("domcontentloaded");

    // Open DB via IPC
    const result = await sqlitePage.evaluate(async (dbPath) => {
      return await window.electronAPI.dbOpen(dbPath);
    }, TEST_DB);
    expect(result.success).toBe(true);

    // Update DB status in UI
    await sqlitePage.evaluate((dbPath) => {
      const fileName = dbPath.split(/[\\/]/).pop();
      document.getElementById("db-status").textContent =
        `Connected: ${fileName}`;
    }, TEST_DB);

    // CREATE TABLE
    await sqlitePage.fill(
      "#sql-input",
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER);"
    );
    await sqlitePage.click("#btn-sql-execute");
    await sqlitePage.waitForFunction(() => {
      const el = document.getElementById("sql-status");
      return el && el.textContent.includes("changes");
    });

    // INSERT data
    await sqlitePage.fill(
      "#sql-input",
      "INSERT INTO users (name, age) VALUES ('Alice', 30), ('Bob', 25), ('Charlie', 35);"
    );
    await sqlitePage.click("#btn-sql-execute");
    await sqlitePage.waitForFunction(() => {
      const el = document.getElementById("sql-status");
      return el && el.textContent.includes("3");
    });

    // SELECT to show result table
    await sqlitePage.fill("#sql-input", "SELECT * FROM users;");
    await sqlitePage.click("#btn-sql-execute");
    await sqlitePage.waitForFunction(() => {
      const el = document.getElementById("sql-result");
      return el && el.textContent.includes("Alice");
    });

    await sqlitePage.screenshot({
      path: path.join(SCREENSHOTS_DIR, "sqlite-console.png"),
    });

    expect(fs.existsSync(path.join(SCREENSHOTS_DIR, "sqlite-console.png"))).toBe(true);
  });

  test("generate FEATURES.md", async () => {
    const markdown = `# Electron Lab - Features

Electron Lab は Electron v40.x の主要 API をデモするアプリケーションです。
各機能はカード形式の UI で提供され、ボタン操作で動作を確認できます。

## Overview

![Main Overview](screenshots/main-overview.png)

メイン画面には全機能がカード形式で一覧表示されます。

---

## #12 Web Browser

**使用 API**: \`BrowserWindow\`, \`webContents.loadURL()\`

任意の URL を Electron の BrowserWindow で開きます。
DOM の取得も可能で、簡易的な Web スクレイピングに利用できます。

![Web Browser](screenshots/web-browser.png)

---

## #15 Monaco Editor

**使用 API**: \`BrowserWindow\`, \`ipcMain.handle()\`, \`dialog\`

VS Code と同じエディタエンジン（Monaco Editor）を子ウィンドウで起動します。
ファイルの読み込み・保存、シンタックスハイライト、言語切り替えに対応。

![Monaco Editor](screenshots/monaco-editor.png)

---

## #17 SQLite Database

**使用 API**: \`better-sqlite3\`, \`ipcMain.handle()\`

SQLite データベースの作成・接続と、SQL コンソールでのクエリ実行機能を提供します。
CREATE TABLE、INSERT、SELECT などの基本的な SQL 操作をインタラクティブに実行できます。

![SQLite Console](screenshots/sqlite-console.png)
`;

    const outputPath = path.resolve(__dirname, "FEATURES.md");
    fs.writeFileSync(outputPath, markdown, "utf-8");

    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content).toContain("Electron Lab");
    expect(content).toContain("main-overview.png");
    expect(content).toContain("web-browser.png");
    expect(content).toContain("monaco-editor.png");
    expect(content).toContain("sqlite-console.png");
  });
});
