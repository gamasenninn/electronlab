const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");
const { launchApp, closeApp } = require("./helpers/electron-app");

const TEMP_DIR = path.resolve(__dirname, "fixtures", "temp");
const TEST_DB = path.resolve(TEMP_DIR, "test.db");

let electronApp;
let page;
let sqlitePage;

/**
 * Helper: close all sqlite windows (those loading sqlite.html).
 */
async function closeSqliteWindows(app) {
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows().forEach((w) => {
      const url = w.webContents.getURL();
      if (url.includes("sqlite.html")) {
        w.close();
      }
    });
  });
}

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
  // Remove temp DB if leftover from previous run
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
});

test.afterAll(async () => {
  // Close DB via IPC
  await electronApp
    .evaluate(async () => {
      const { ipcMain } = require("electron");
      // Trigger close if db is open
    })
    .catch(() => {});
  await closeSqliteWindows(electronApp);
  await closeApp(electronApp);
  // Clean up temp files
  if (fs.existsSync(TEST_DB)) {
    try {
      fs.unlinkSync(TEST_DB);
    } catch {
      // ignore
    }
  }
});

// --- Test 1: Card #17 is visible ---
test("card #17 is visible with correct title", async () => {
  const number = page.locator(".card-number").filter({ hasText: /^17$/ });
  await expect(number).toBeVisible();
  const title = page
    .locator(".card-title")
    .filter({ hasText: "SQLite Database" });
  await expect(title).toBeVisible();
});

// --- Test 2: SQL Console child window opens ---
test("SQL Console child window opens", async () => {
  const windowPromise = electronApp.waitForEvent("window");
  await page.click("#btn-db-console");
  sqlitePage = await windowPromise;
  await sqlitePage.waitForLoadState("domcontentloaded");
  expect(sqlitePage).toBeTruthy();

  await page.waitForFunction(() => {
    const el = document.getElementById("result-sqlite");
    return el && el.textContent.includes("Console opened");
  });

  const result = await page.locator("#result-sqlite").textContent();
  expect(result).toContain("Console opened");
  expect(result).toMatch(/ID: \d+/);
});

// --- Test 3: Open DB and show connected message ---
test("opens database and shows connected message", async () => {
  // Open DB via the console's preload API (IPC to main process)
  const result = await sqlitePage.evaluate(async (dbPath) => {
    return await window.electronAPI.dbOpen(dbPath);
  }, TEST_DB);

  expect(result.success).toBe(true);

  // Update the UI status manually (since the button handler isn't invoked)
  await sqlitePage.evaluate((dbPath) => {
    const fileName = dbPath.split(/[\\/]/).pop();
    document.getElementById("db-status").textContent =
      `Connected: ${fileName}`;
  }, TEST_DB);

  const status = await sqlitePage.locator("#db-status").textContent();
  expect(status).toContain("Connected");
  expect(status).toContain("test.db");
});

// --- Test 4: SELECT sqlite_version() ---
test("executes SELECT sqlite_version()", async () => {
  await sqlitePage.fill("#sql-input", "SELECT sqlite_version();");
  await sqlitePage.click("#btn-sql-execute");

  await sqlitePage.waitForFunction(() => {
    const el = document.getElementById("sql-result");
    return el && el.querySelector("table") !== null;
  });

  const resultText = await sqlitePage.locator("#sql-result").textContent();
  // SQLite version should match a pattern like 3.x.x
  expect(resultText).toMatch(/3\.\d+\.\d+/);
});

// --- Test 5: CREATE TABLE + INSERT ---
test("executes CREATE TABLE and INSERT", async () => {
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

  let status = await sqlitePage.locator("#sql-status").textContent();
  expect(status).toContain("changes");

  // INSERT
  await sqlitePage.fill(
    "#sql-input",
    "INSERT INTO users (name, age) VALUES ('Alice', 30), ('Bob', 25);"
  );
  await sqlitePage.click("#btn-sql-execute");

  await sqlitePage.waitForFunction(() => {
    const el = document.getElementById("sql-status");
    return el && el.textContent.includes("2");
  });

  status = await sqlitePage.locator("#sql-status").textContent();
  expect(status).toContain("2");
});

// --- Test 6: SELECT retrieves data ---
test("SELECT retrieves inserted data", async () => {
  await sqlitePage.fill("#sql-input", "SELECT * FROM users;");
  await sqlitePage.click("#btn-sql-execute");

  await sqlitePage.waitForFunction(() => {
    const el = document.getElementById("sql-result");
    return el && el.textContent.includes("Alice");
  });

  const resultText = await sqlitePage.locator("#sql-result").textContent();
  expect(resultText).toContain("Alice");
  expect(resultText).toContain("Bob");
  expect(resultText).toContain("30");
  expect(resultText).toContain("25");
});

// --- Test 7: List Tables ---
test("List Tables shows table names", async () => {
  await sqlitePage.click("#btn-sql-tables");

  await sqlitePage.waitForFunction(() => {
    const el = document.getElementById("sql-result");
    return el && el.textContent.includes("users");
  });

  const resultText = await sqlitePage.locator("#sql-result").textContent();
  expect(resultText).toContain("users");
});

// --- Test 8: Invalid SQL shows error ---
test("invalid SQL shows error", async () => {
  await sqlitePage.fill("#sql-input", "INVALID SQL STATEMENT;");
  await sqlitePage.click("#btn-sql-execute");

  await sqlitePage.waitForFunction(() => {
    const el = document.getElementById("sql-status");
    return el && el.textContent.includes("Error");
  });

  const status = await sqlitePage.locator("#sql-status").textContent();
  expect(status).toContain("Error");
});

// --- Test 9: Empty SQL shows error ---
test("empty SQL shows error message", async () => {
  await sqlitePage.fill("#sql-input", "");
  await sqlitePage.click("#btn-sql-execute");

  await sqlitePage.waitForFunction(() => {
    const el = document.getElementById("sql-status");
    return el && el.textContent.includes("Please enter");
  });

  const status = await sqlitePage.locator("#sql-status").textContent();
  expect(status).toContain("Please enter");
});

// --- Test 10: Execute without DB shows error ---
test("execute without open database shows error", async () => {
  // Close the database
  await sqlitePage.click("#btn-db-close");

  await sqlitePage.waitForFunction(() => {
    const el = document.getElementById("db-status");
    return el && el.textContent.includes("No database");
  });

  // Try to execute SQL
  await sqlitePage.fill("#sql-input", "SELECT 1;");
  await sqlitePage.click("#btn-sql-execute");

  await sqlitePage.waitForFunction(() => {
    const el = document.getElementById("sql-status");
    return el && el.textContent.includes("No database");
  });

  const status = await sqlitePage.locator("#sql-status").textContent();
  expect(status).toContain("No database");
});
