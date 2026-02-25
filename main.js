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
  globalShortcut,
  shell,
  net,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

const Database = require("better-sqlite3");
const pty = require("node-pty");

let mainWindow;
let tray = null;
let browserWindow = null;
let editorWindow = null;
let sqliteWindow = null;
let currentDb = null;
let currentDbPath = null;
let terminalWindow = null;
let terminalPty = null;

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

// #13 Shortcuts (globalShortcut)
const registeredShortcuts = new Set();

ipcMain.handle("shortcut:register", (_, accelerator) => {
  try {
    const ret = globalShortcut.register(accelerator, () => {
      mainWindow.webContents.send("shortcut:triggered", accelerator);
    });
    if (ret) {
      registeredShortcuts.add(accelerator);
      return { success: true };
    }
    return { success: false, error: "Registration failed" };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("shortcut:unregister", (_, accelerator) => {
  try {
    globalShortcut.unregister(accelerator);
    registeredShortcuts.delete(accelerator);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("shortcut:unregisterAll", () => {
  globalShortcut.unregisterAll();
  registeredShortcuts.clear();
  return { success: true };
});

ipcMain.handle("shortcut:getAll", () => {
  return { shortcuts: Array.from(registeredShortcuts) };
});

// #14 Shell Integration
ipcMain.handle("shell:openExternal", async (_, url) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { success: false, error: "Protocol not allowed. Only http and https are permitted." };
    }
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("shell:openPath", async (_, filePath) => {
  try {
    const errorMessage = await shell.openPath(filePath);
    if (errorMessage) {
      return { success: false, error: errorMessage };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("shell:showItemInFolder", (_, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// #16 Network Request (net)
ipcMain.handle("net:request", (_, { url, method, headers, body }) => {
  return new Promise((resolve) => {
    try {
      const request = net.request({ method: method || "GET", url });

      if (headers && typeof headers === "object") {
        for (const [key, value] of Object.entries(headers)) {
          request.setHeader(key, value);
        }
      }

      request.on("response", (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk.toString()));
        response.on("end", () => {
          const rawHeaders = response.headers || {};
          resolve({
            success: true,
            status: response.statusCode,
            statusText: response.statusMessage || "",
            headers: rawHeaders,
            body: chunks.join(""),
          });
        });
      });

      request.on("error", (err) => {
        resolve({ success: false, error: err.message });
      });

      if (body) {
        request.write(body);
      }
      request.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

ipcMain.handle("net:isOnline", () => {
  return { online: net.isOnline() };
});

// #17 SQLite Database
ipcMain.handle("db:open", (_, filePath) => {
  try {
    if (currentDb) {
      currentDb.close();
    }
    currentDb = new Database(filePath);
    currentDbPath = filePath;
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("db:close", () => {
  try {
    if (currentDb) {
      currentDb.close();
      currentDb = null;
      currentDbPath = null;
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("db:execute", (_, sql) => {
  try {
    if (!currentDb) {
      return { success: false, error: "No database is open." };
    }
    const trimmed = sql.trim().toUpperCase();
    if (
      trimmed.startsWith("SELECT") ||
      trimmed.startsWith("PRAGMA") ||
      trimmed.startsWith("EXPLAIN")
    ) {
      const stmt = currentDb.prepare(sql);
      const rows = stmt.all();
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return { success: true, columns, rows };
    } else {
      const stmt = currentDb.prepare(sql);
      const info = stmt.run();
      return { success: true, changes: info.changes };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("db:tables", () => {
  try {
    if (!currentDb) {
      return { success: false, error: "No database is open." };
    }
    const rows = currentDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();
    const tables = rows.map((r) => r.name);
    return { success: true, tables };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("db:openConsole", () => {
  if (sqliteWindow && !sqliteWindow.isDestroyed()) {
    sqliteWindow.close();
  }

  sqliteWindow = new BrowserWindow({
    width: 900,
    height: 600,
    parent: mainWindow,
    modal: false,
    title: "SQL Console",
    backgroundColor: "#1a1a2e",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  sqliteWindow.loadFile("sqlite.html");

  sqliteWindow.on("closed", () => {
    sqliteWindow = null;
  });

  return { id: sqliteWindow.id };
});

// #18 Terminal
ipcMain.handle("terminal:open", () => {
  if (terminalPty) {
    terminalPty.kill();
    terminalPty = null;
  }
  if (terminalWindow && !terminalWindow.isDestroyed()) {
    terminalWindow.close();
  }

  const shell = process.platform === "win32" ? "powershell.exe" : "bash";
  terminalPty = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: os.homedir(),
    env: process.env,
  });

  global.__terminalPty = terminalPty;

  terminalWindow = new BrowserWindow({
    width: 800,
    height: 500,
    parent: mainWindow,
    modal: false,
    title: "Terminal",
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  terminalWindow.loadFile("terminal.html", { query: { shell } });

  terminalPty.onData((data) => {
    if (terminalWindow && !terminalWindow.isDestroyed()) {
      terminalWindow.webContents.send("terminal:data", data);
    }
  });

  terminalPty.onExit(({ exitCode }) => {
    if (terminalWindow && !terminalWindow.isDestroyed()) {
      terminalWindow.webContents.send("terminal:exit", exitCode);
    }
    terminalPty = null;
    global.__terminalPty = null;
  });

  terminalWindow.on("closed", () => {
    if (terminalPty) {
      terminalPty.kill();
      terminalPty = null;
      global.__terminalPty = null;
    }
    terminalWindow = null;
  });

  return { id: terminalWindow.id, shell };
});

ipcMain.on("terminal:input", (_, data) => {
  if (terminalPty) {
    terminalPty.write(data);
  }
});

ipcMain.on("terminal:resize", (_, { cols, rows }) => {
  if (terminalPty) {
    terminalPty.resize(cols, rows);
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

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (terminalPty) {
    terminalPty.kill();
    terminalPty = null;
  }
  if (currentDb) {
    currentDb.close();
    currentDb = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
