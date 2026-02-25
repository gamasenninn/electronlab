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

test("captures screens and displays thumbnails", async () => {
  await page.click("#btn-capture");

  // Wait for capture to complete (replaces "Capturing..." text)
  await page.waitForFunction(
    () => {
      const el = document.getElementById("result-capture");
      return el && el.textContent !== "Capturing..." && el.innerHTML.length > 0;
    },
    { timeout: 15000 }
  );

  // Check that at least one image is displayed
  const images = page.locator("#result-capture img");
  const count = await images.count();
  expect(count).toBeGreaterThan(0);

  // Verify image src is a data URL
  const firstSrc = await images.first().getAttribute("src");
  expect(firstSrc).toMatch(/^data:image\/png/);
});

test("capture result shows source names", async () => {
  await page.click("#btn-capture");

  await page.waitForFunction(
    () => {
      const el = document.getElementById("result-capture");
      return el && el.querySelector("strong") !== null;
    },
    { timeout: 15000 }
  );

  const names = page.locator("#result-capture strong");
  const count = await names.count();
  expect(count).toBeGreaterThan(0);

  // Each source should have a non-empty name
  const firstName = await names.first().textContent();
  expect(firstName.length).toBeGreaterThan(0);
});
