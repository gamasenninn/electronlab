const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  clipboard,
  Notification,
  Menu,
  Tray,
  nativeImage,
  desktopCapturer,
  screen,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

let mainWindow;
let tray = null;
let browserWindow = null;
let editorWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "Electron Lab",
    backgroundColor: "#1a1a2e",
  });

  mainWindow.loadFile("index.html");
}

// --- Custom Menu ---
function buildMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open File...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ["openFile"],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send(
                "menu-action",
                `Opened: ${result.filePaths[0]}`
              );
            }
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Electron Lab",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Electron Lab",
              message: "Electron Lab v1.0.0",
              detail:
                "A demo app to explore Electron APIs.\n" +
                `Electron: ${process.versions.electron}\n` +
                `Chrome: ${process.versions.chrome}\n` +
                `Node.js: ${process.versions.node}`,
            });
          },
        },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// --- Tray Icon ---
function createTray() {
  // Create a simple 16x16 icon programmatically
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAW0lEQVQ4T2NkoBAwUqifYdAb8P8/w38GBob/+" +
      "BzAwMDIwMjIiNcFjMgCeA1gZMRrAKoNDMguwGkDIyNuFzAy4nYBIyOGCxgZ0V3AyIjuAkZGZBcwMmK4AADQ2xARGoiJWgAAAABJRU5ErkJggg=="
  );

  tray = new Tray(icon);
  tray.setToolTip("Electron Lab");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Window",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Notification Test",
      click: () => {
        new Notification({
          title: "Tray Notification",
          body: "Hello from system tray!",
        }).show();
      },
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
}

// =========== IPC Handlers ===========

// #2 Dialog
ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "All Files", extensions: ["*"] },
      { name: "Text", extensions: ["txt", "md", "json", "js"] },
    ],
  });
  return result;
});

ipcMain.handle("dialog:saveFile", async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: "Text Files", extensions: ["txt"] }],
  });
  return result;
});

ipcMain.handle("dialog:messageBox", async () => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: ["OK", "Cancel", "Maybe"],
    defaultId: 0,
    title: "Message Box Demo",
    message: "This is a message box!",
    detail: "You can choose one of the buttons below.",
  });
  return { response: result.response, button: ["OK", "Cancel", "Maybe"][result.response] };
});

// #3 Clipboard
ipcMain.handle("clipboard:read", () => {
  return clipboard.readText();
});

ipcMain.handle("clipboard:write", (_, text) => {
  clipboard.writeText(text);
  return true;
});

// #4 Notification
ipcMain.handle("notification:show", (_, { title, body }) => {
  const notif = new Notification({ title, body });
  notif.show();
  return true;
});

// #5 System Info
ipcMain.handle("system:info", () => {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    cpus: os.cpus().length,
    totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    hostname: os.hostname(),
    homeDir: os.homedir(),
    uptime: `${(os.uptime() / 3600).toFixed(1)} hours`,
    appVersion: app.getVersion(),
    appPath: app.getAppPath(),
  };
});

// #8 File Read/Write
ipcMain.handle("fs:readFile", async (_, filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("fs:writeFile", async (_, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// #9 Child Window
ipcMain.handle("window:openChild", () => {
  const child = new BrowserWindow({
    width: 400,
    height: 300,
    parent: mainWindow,
    modal: false,
    title: "Child Window",
    backgroundColor: "#16213e",
    webPreferences: {
      contextIsolation: true,
    },
  });

  child.loadURL(
    `data:text/html;charset=utf-8,
    <html>
      <body style="background:#16213e;color:#e0e0e0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;">
          <h2>Child Window</h2>
          <p>This is a child BrowserWindow.</p>
          <p>Created at ${new Date().toLocaleTimeString()}</p>
        </div>
      </body>
    </html>`
  );

  return { id: child.id };
});

// #12 Web Browser
ipcMain.handle("browser:open", (_, url) => {
  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.close();
  }

  browserWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    parent: mainWindow,
    modal: false,
    title: "Web Browser",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  browserWindow.loadURL(url);

  browserWindow.on("closed", () => {
    browserWindow = null;
  });

  return { id: browserWindow.id };
});

ipcMain.handle("browser:getDom", async () => {
  if (!browserWindow || browserWindow.isDestroyed()) {
    return { success: false, error: "No browser window is open." };
  }
  try {
    const dom = await browserWindow.webContents.executeJavaScript(
      "document.documentElement.outerHTML"
    );
    return { success: true, dom };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// #15 Monaco Editor
ipcMain.handle("editor:open", () => {
  if (editorWindow && !editorWindow.isDestroyed()) {
    editorWindow.close();
  }

  editorWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    parent: mainWindow,
    modal: false,
    title: "Monaco Editor",
    backgroundColor: "#1e1e1e",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  editorWindow.loadFile("editor.html");

  editorWindow.on("closed", () => {
    editorWindow = null;
  });

  return { id: editorWindow.id };
});

// #10 Screen Capture
ipcMain.handle("capture:screen", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 320, height: 180 },
    });

    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL(),
    }));
  } catch (err) {
    return { error: err.message };
  }
});

// =========== App Lifecycle ===========

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
