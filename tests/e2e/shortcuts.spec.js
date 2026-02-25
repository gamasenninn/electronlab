const { test, expect } = require("@playwright/test");
const { launchApp, closeApp } = require("./helpers/electron-app");

let electronApp;
let page;

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  // Unregister all shortcuts to clean up
  await electronApp.evaluate(({ globalShortcut }) => {
    globalShortcut.unregisterAll();
  });
  await closeApp(electronApp);
});

test("card #13 is visible with correct title", async () => {
  const number = page.locator(".card-number").filter({ hasText: /^13$/ });
  await expect(number).toBeVisible();
  const title = page.locator(".card-title").filter({ hasText: "Shortcuts" });
  await expect(title).toBeVisible();
});

test("registers a shortcut and shows success message", async () => {
  await page.fill("#shortcut-input", "CmdOrCtrl+Shift+X");
  await page.click("#btn-shortcut-register");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-shortcut");
    return el && el.textContent.includes("Registered");
  });

  const result = await page.locator("#result-shortcut").textContent();
  expect(result).toContain("Registered");
  expect(result).toContain("CmdOrCtrl+Shift+X");
});

test("registered shortcut appears in the list", async () => {
  await page.click("#btn-shortcut-getall");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-shortcut");
    return el && el.textContent.includes("CmdOrCtrl+Shift+X");
  });

  const result = await page.locator("#result-shortcut").textContent();
  expect(result).toContain("CmdOrCtrl+Shift+X");
});

test("unregisters a shortcut", async () => {
  await page.fill("#shortcut-input", "CmdOrCtrl+Shift+X");
  await page.click("#btn-shortcut-unregister");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-shortcut");
    return el && el.textContent.includes("Unregistered");
  });

  const result = await page.locator("#result-shortcut").textContent();
  expect(result).toContain("Unregistered");
});

test("unregister all shortcuts", async () => {
  // Register two shortcuts first
  await page.fill("#shortcut-input", "CmdOrCtrl+Shift+A");
  await page.click("#btn-shortcut-register");
  await page.waitForFunction(() => {
    const el = document.getElementById("result-shortcut");
    return el && el.textContent.includes("Registered");
  });

  await page.fill("#shortcut-input", "CmdOrCtrl+Shift+B");
  await page.click("#btn-shortcut-register");
  await page.waitForFunction(() => {
    const el = document.getElementById("result-shortcut");
    return el && el.textContent.includes("CmdOrCtrl+Shift+B");
  });

  await page.click("#btn-shortcut-unregisterall");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-shortcut");
    return el && el.textContent.includes("All unregistered");
  });

  const result = await page.locator("#result-shortcut").textContent();
  expect(result).toContain("All unregistered");
});

test("shortcut triggered notification appears in result", async () => {
  // Register a shortcut
  await page.fill("#shortcut-input", "CmdOrCtrl+Shift+T");
  await page.click("#btn-shortcut-register");
  await page.waitForFunction(() => {
    const el = document.getElementById("result-shortcut");
    return el && el.textContent.includes("Registered");
  });

  // Simulate the shortcut being triggered by sending the event from main process
  await electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find(
      (w) => w.title === "Electron Lab" || w.webContents.getURL().includes("index.html")
    );
    if (win) {
      win.webContents.send("shortcut:triggered", "CmdOrCtrl+Shift+T");
    }
  });

  await page.waitForFunction(() => {
    const el = document.getElementById("result-shortcut");
    return el && el.textContent.includes("Triggered");
  });

  const result = await page.locator("#result-shortcut").textContent();
  expect(result).toContain("Triggered");
  expect(result).toContain("CmdOrCtrl+Shift+T");

  // Clean up
  await electronApp.evaluate(({ globalShortcut }) => {
    globalShortcut.unregisterAll();
  });
});

test("shows error for empty shortcut input", async () => {
  await page.fill("#shortcut-input", "");
  await page.click("#btn-shortcut-register");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-shortcut");
    return el && el.textContent.includes("Please enter");
  });

  const result = await page.locator("#result-shortcut").textContent();
  expect(result).toContain("Please enter");
});
