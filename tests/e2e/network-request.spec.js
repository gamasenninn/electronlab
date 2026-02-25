const { test, expect } = require("@playwright/test");
const { launchApp, closeApp } = require("./helpers/electron-app");

let electronApp;
let page;

/**
 * Mock the net:request IPC handler to return a fixed response
 * and record the arguments it received.
 */
async function mockNetRequest(electronApp, response) {
  await electronApp.evaluate(({ ipcMain }, resp) => {
    global.__netRequestCalls = [];
    ipcMain.removeHandler("net:request");
    ipcMain.handle("net:request", (_, args) => {
      global.__netRequestCalls.push(args);
      return resp;
    });
  }, response);
}

/**
 * Mock net.isOnline to return a fixed value.
 */
async function mockNetIsOnline(electronApp, online) {
  await electronApp.evaluate(({ ipcMain }, val) => {
    ipcMain.removeHandler("net:isOnline");
    ipcMain.handle("net:isOnline", () => {
      return { online: val };
    });
  }, online);
}

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp(electronApp);
});

test("card #16 is visible with correct title", async () => {
  const number = page.locator(".card-number").filter({ hasText: /^16$/ });
  await expect(number).toBeVisible();
  const title = page.locator(".card-title").filter({ hasText: "Network Request" });
  await expect(title).toBeVisible();
});

test("default values are correct", async () => {
  const urlInput = page.locator("#net-url");
  await expect(urlInput).toHaveValue("https://httpbin.org/get");

  const methodSelect = page.locator("#net-method");
  await expect(methodSelect).toHaveValue("GET");
});

test("GET request shows status and body", async () => {
  await mockNetRequest(electronApp, {
    success: true,
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    body: '{"origin": "127.0.0.1"}',
  });

  await page.fill("#net-url", "https://httpbin.org/get");
  await page.click("#btn-net-send");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-net");
    return el && el.textContent.includes("200");
  });

  const result = await page.locator("#result-net").textContent();
  expect(result).toContain("200");
  expect(result).toContain("origin");
});

test("POST request sends with correct method", async () => {
  await mockNetRequest(electronApp, {
    success: true,
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    body: '{"method": "POST"}',
  });

  await page.fill("#net-url", "https://httpbin.org/post");
  await page.selectOption("#net-method", "POST");
  await page.click("#btn-net-send");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-net");
    return el && el.textContent.includes("200");
  });

  const result = await page.locator("#result-net").textContent();
  expect(result).toContain("200");

  // Verify mock received correct method
  const calls = await electronApp.evaluate(() => global.__netRequestCalls);
  expect(calls[calls.length - 1].method).toBe("POST");
});

test("POST request sends body", async () => {
  await mockNetRequest(electronApp, {
    success: true,
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    body: '{"data": "received"}',
  });

  await page.fill("#net-url", "https://httpbin.org/post");
  await page.selectOption("#net-method", "POST");
  await page.fill("#net-body", '{"name": "test"}');
  await page.click("#btn-net-send");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-net");
    return el && el.textContent.includes("200");
  });

  const calls = await electronApp.evaluate(() => global.__netRequestCalls);
  const lastCall = calls[calls.length - 1];
  expect(lastCall.method).toBe("POST");
  expect(lastCall.body).toBe('{"name": "test"}');
});

test("custom headers are sent with request", async () => {
  await mockNetRequest(electronApp, {
    success: true,
    status: 200,
    statusText: "OK",
    headers: {},
    body: "ok",
  });

  await page.fill("#net-url", "https://httpbin.org/get");
  await page.selectOption("#net-method", "GET");
  await page.fill("#net-headers", '{"Authorization": "Bearer test123"}');
  await page.click("#btn-net-send");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-net");
    return el && el.textContent.includes("200");
  });

  const calls = await electronApp.evaluate(() => global.__netRequestCalls);
  const lastCall = calls[calls.length - 1];
  expect(lastCall.headers).toEqual({ Authorization: "Bearer test123" });
});

test("shows error for empty URL", async () => {
  await page.fill("#net-url", "");
  await page.click("#btn-net-send");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-net");
    return el && el.textContent.includes("Please enter");
  });

  const result = await page.locator("#result-net").textContent();
  expect(result).toContain("Please enter");
});

test("shows error for invalid JSON headers", async () => {
  await page.fill("#net-url", "https://httpbin.org/get");
  await page.fill("#net-headers", "{invalid}");
  await page.click("#btn-net-send");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-net");
    return el && el.textContent.includes("Invalid");
  });

  const result = await page.locator("#result-net").textContent();
  expect(result).toContain("Invalid");
});

test("check online shows network status", async () => {
  await mockNetIsOnline(electronApp, true);

  await page.click("#btn-net-online");

  await page.waitForFunction(() => {
    const el = document.getElementById("result-net");
    return el && el.textContent.includes("Online");
  });

  const result = await page.locator("#result-net").textContent();
  expect(result).toContain("Online");
});
