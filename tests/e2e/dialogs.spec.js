const { test, expect } = require("@playwright/test");
const {
  launchApp,
  closeApp,
  mockOpenDialog,
  mockOpenDialogCancel,
  mockSaveDialog,
  mockSaveDialogCancel,
  mockMessageBox,
} = require("./helpers/electron-app");

let electronApp;
let page;

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp(electronApp);
});

test("open file dialog shows selected file path", async () => {
  await mockOpenDialog(electronApp, ["/tmp/test-file.txt"]);
  await page.click("#btn-dialog-open");
  const result = await page.locator("#result-dialog").textContent();
  expect(result).toContain("Selected:");
  expect(result).toContain("/tmp/test-file.txt");
});

test("open file dialog shows canceled message", async () => {
  await mockOpenDialogCancel(electronApp);
  await page.click("#btn-dialog-open");
  const result = await page.locator("#result-dialog").textContent();
  expect(result).toContain("canceled");
});

test("save file dialog shows save path", async () => {
  await mockSaveDialog(electronApp, "/tmp/saved-file.txt");
  await page.click("#btn-dialog-save");
  const result = await page.locator("#result-dialog").textContent();
  expect(result).toContain("Save path:");
  expect(result).toContain("/tmp/saved-file.txt");
});

test("save file dialog shows canceled message", async () => {
  await mockSaveDialogCancel(electronApp);
  await page.click("#btn-dialog-save");
  const result = await page.locator("#result-dialog").textContent();
  expect(result).toContain("canceled");
});

test("message box shows button clicked (OK)", async () => {
  await mockMessageBox(electronApp, 0);
  await page.click("#btn-dialog-msg");
  const result = await page.locator("#result-dialog").textContent();
  expect(result).toContain('"OK"');
  expect(result).toContain("index: 0");
});

test("message box shows button clicked (Cancel)", async () => {
  await mockMessageBox(electronApp, 1);
  await page.click("#btn-dialog-msg");
  const result = await page.locator("#result-dialog").textContent();
  expect(result).toContain('"Cancel"');
  expect(result).toContain("index: 1");
});

test("message box shows button clicked (Maybe)", async () => {
  await mockMessageBox(electronApp, 2);
  await page.click("#btn-dialog-msg");
  const result = await page.locator("#result-dialog").textContent();
  expect(result).toContain('"Maybe"');
  expect(result).toContain("index: 2");
});
