const { _electron: electron } = require("@playwright/test");
const path = require("path");

const APP_PATH = path.resolve(__dirname, "..", "..", "..");

/**
 * Launch the Electron app and return the app + first window page.
 */
async function launchApp() {
  const electronApp = await electron.launch({
    args: [APP_PATH],
  });
  const page = await electronApp.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  return { electronApp, page };
}

/**
 * Close the Electron app gracefully.
 */
async function closeApp(electronApp) {
  await electronApp.close();
}

/**
 * Mock dialog.showOpenDialog to return specified file paths.
 */
async function mockOpenDialog(electronApp, filePaths) {
  await electronApp.evaluate(({ dialog }, paths) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: paths,
    });
  }, filePaths);
}

/**
 * Mock dialog.showOpenDialog to return canceled.
 */
async function mockOpenDialogCancel(electronApp) {
  await electronApp.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({
      canceled: true,
      filePaths: [],
    });
  });
}

/**
 * Mock dialog.showSaveDialog to return specified file path.
 */
async function mockSaveDialog(electronApp, filePath) {
  await electronApp.evaluate(({ dialog }, fp) => {
    dialog.showSaveDialog = async () => ({
      canceled: false,
      filePath: fp,
    });
  }, filePath);
}

/**
 * Mock dialog.showSaveDialog to return canceled.
 */
async function mockSaveDialogCancel(electronApp) {
  await electronApp.evaluate(({ dialog }) => {
    dialog.showSaveDialog = async () => ({
      canceled: true,
      filePath: "",
    });
  });
}

/**
 * Mock dialog.showMessageBox to return specified button index.
 */
async function mockMessageBox(electronApp, responseIndex = 0) {
  await electronApp.evaluate(({ dialog }, idx) => {
    dialog.showMessageBox = async () => ({
      response: idx,
      checkboxChecked: false,
    });
  }, responseIndex);
}

module.exports = {
  launchApp,
  closeApp,
  mockOpenDialog,
  mockOpenDialogCancel,
  mockSaveDialog,
  mockSaveDialogCancel,
  mockMessageBox,
};
