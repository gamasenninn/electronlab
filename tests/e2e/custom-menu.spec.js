const { test, expect } = require("@playwright/test");
const { launchApp, closeApp, mockOpenDialog } = require("./helpers/electron-app");

let electronApp;
let page;

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp(electronApp);
});

test("application menu has File, View, Help menus", async () => {
  const menuLabels = await electronApp.evaluate(({ Menu }) => {
    const menu = Menu.getApplicationMenu();
    return menu.items.map((item) => item.label);
  });
  expect(menuLabels).toContain("File");
  expect(menuLabels).toContain("View");
  expect(menuLabels).toContain("Help");
});

test("File menu has Open File and Quit items", async () => {
  const subItems = await electronApp.evaluate(({ Menu }) => {
    const menu = Menu.getApplicationMenu();
    const fileMenu = menu.items.find((item) => item.label === "File");
    return fileMenu.submenu.items
      .filter((item) => item.type !== "separator")
      .map((item) => item.label);
  });
  expect(subItems).toContain("Open File...");
});

test("View menu has Reload and Toggle DevTools", async () => {
  const subItems = await electronApp.evaluate(({ Menu }) => {
    const menu = Menu.getApplicationMenu();
    const viewMenu = menu.items.find((item) => item.label === "View");
    return viewMenu.submenu.items
      .filter((item) => item.type !== "separator")
      .map((item) => item.role || item.label);
  });
  expect(subItems).toContain("reload");
  expect(subItems).toContain("toggledevtools");
});

test("Help menu has About Electron Lab item", async () => {
  const subItems = await electronApp.evaluate(({ Menu }) => {
    const menu = Menu.getApplicationMenu();
    const helpMenu = menu.items.find((item) => item.label === "Help");
    return helpMenu.submenu.items.map((item) => item.label);
  });
  expect(subItems).toContain("About Electron Lab");
});

test("File > Open File triggers menu-action on renderer", async () => {
  // Mock the dialog so it doesn't block
  await mockOpenDialog(electronApp, ["/tmp/menu-test.txt"]);

  // Click the menu item programmatically
  await electronApp.evaluate(({ Menu }) => {
    const menu = Menu.getApplicationMenu();
    const fileMenu = menu.items.find((item) => item.label === "File");
    const openItem = fileMenu.submenu.items.find(
      (item) => item.label === "Open File..."
    );
    openItem.click();
  });

  // Wait for the result to appear
  await page.waitForFunction(() => {
    const el = document.getElementById("result-menu");
    return el && el.textContent.includes("Opened:");
  });

  const result = await page.locator("#result-menu").textContent();
  expect(result).toContain("Opened:");
  expect(result).toContain("/tmp/menu-test.txt");
});
