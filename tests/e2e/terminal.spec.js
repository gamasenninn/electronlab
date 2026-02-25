const { test, expect } = require("@playwright/test");
const { launchApp, closeApp } = require("./helpers/electron-app");

let electronApp;
let page;

/**
 * Helper: close all terminal windows (those loading terminal.html).
 */
async function closeTerminalWindows(app) {
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows().forEach((w) => {
      const url = w.webContents.getURL();
      if (url.includes("terminal.html")) {
        w.close();
      }
    });
  });
}

/**
 * Helper: open terminal window and return its page.
 */
async function openTerminalWindow() {
  const windowPromise = electronApp.waitForEvent("window");
  await page.click("#btn-terminal-open");
  const terminalPage = await windowPromise;
  await terminalPage.waitForLoadState("domcontentloaded");
  return terminalPage;
}

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  // Kill pty process if running
  await electronApp
    .evaluate(() => {
      if (global.__terminalPty) {
        global.__terminalPty.kill();
        global.__terminalPty = null;
      }
    })
    .catch(() => {});
  await closeTerminalWindows(electronApp);
  await closeApp(electronApp);
});

// --- Test 1: Card #18 is visible ---
test("card #18 is visible with correct title", async () => {
  const number = page.locator(".card-number").filter({ hasText: /^18$/ });
  await expect(number).toBeVisible();
  const title = page.locator(".card-title").filter({ hasText: "Terminal" });
  await expect(title).toBeVisible();
});

// --- Test 2: Terminal window opens ---
test("opens terminal window on button click", async () => {
  const terminalPage = await openTerminalWindow();
  expect(terminalPage).toBeTruthy();

  await page.waitForFunction(() => {
    const el = document.getElementById("result-terminal");
    return el && el.textContent.includes("Terminal opened");
  });

  const result = await page.locator("#result-terminal").textContent();
  expect(result).toContain("Terminal opened");
  expect(result).toMatch(/ID: \d+/);
});

// --- Test 3: xterm.js is rendered ---
test("xterm.js is rendered in terminal window", async () => {
  const windows = electronApp.windows();
  const terminalPage = windows.find((w) => w.url().includes("terminal.html"));
  expect(terminalPage).toBeTruthy();

  await terminalPage.waitForFunction(
    () => document.querySelector(".xterm") !== null,
    { timeout: 15000 }
  );

  const xtermEl = terminalPage.locator(".xterm");
  await expect(xtermEl).toBeVisible();
});

// --- Test 4: Shell output is received ---
test("receives shell output", async () => {
  const windows = electronApp.windows();
  const terminalPage = windows.find((w) => w.url().includes("terminal.html"));

  // Wait for any shell output (prompt or welcome message)
  await terminalPage.waitForFunction(
    () => {
      const el = document.querySelector(".xterm-rows");
      return el && el.textContent.trim().length > 0;
    },
    { timeout: 15000 }
  );

  const content = await terminalPage.evaluate(() => {
    const el = document.querySelector(".xterm-rows");
    return el ? el.textContent : "";
  });
  expect(content.trim().length).toBeGreaterThan(0);
});

// --- Test 5: Keyboard input and echo command ---
test("keyboard input produces echo output", async () => {
  const windows = electronApp.windows();
  const terminalPage = windows.find((w) => w.url().includes("terminal.html"));

  // Wait for shell to be ready (prompt visible)
  await terminalPage.waitForTimeout(2000);

  // Send input via preload API (xterm uses canvas, keyboard events are unreliable in tests)
  await terminalPage.evaluate(() => {
    window.electronAPI.terminalInput("echo HELLO_TERMINAL_TEST\r");
  });

  // Wait for echo output
  await terminalPage.waitForFunction(
    () => {
      const el = document.querySelector(".xterm-rows");
      return el && el.textContent.includes("HELLO_TERMINAL_TEST");
    },
    { timeout: 15000 }
  );

  const content = await terminalPage.evaluate(() => {
    const el = document.querySelector(".xterm-rows");
    return el ? el.textContent : "";
  });
  expect(content).toContain("HELLO_TERMINAL_TEST");
});

// --- Test 6: Opening new terminal closes previous one ---
test("opening a new terminal closes the previous one", async () => {
  // Open second terminal (should close the first)
  const windowPromise = electronApp.waitForEvent("window");
  await page.click("#btn-terminal-open");
  await windowPromise;

  await page.waitForTimeout(500);

  // Count terminal windows
  const count = await electronApp.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().filter((w) => {
      return w.webContents.getURL().includes("terminal.html");
    }).length;
  });
  expect(count).toBe(1);
});

// --- Test 7: Closing window cleans up pty process ---
test("closing window cleans up pty process", async () => {
  // Close terminal windows
  await closeTerminalWindows(electronApp);
  await page.waitForTimeout(500);

  // Verify pty is cleaned up
  const ptyExists = await electronApp.evaluate(() => {
    return global.__terminalPty !== null && global.__terminalPty !== undefined;
  });
  expect(ptyExists).toBe(false);
});

// --- Test 8: Status bar shows shell info ---
test("status bar shows shell information", async () => {
  // Open a fresh terminal
  const terminalPage = await openTerminalWindow();

  // Wait for status bar to be populated
  await terminalPage.waitForFunction(
    () => {
      const el = document.getElementById("terminal-status");
      return el && el.textContent.trim().length > 0;
    },
    { timeout: 15000 }
  );

  const status = await terminalPage.locator("#terminal-status").textContent();
  expect(status.length).toBeGreaterThan(0);
  // Should contain shell name (powershell or bash etc.)
  expect(status.toLowerCase()).toMatch(/powershell|bash|cmd|sh|zsh/);
});
