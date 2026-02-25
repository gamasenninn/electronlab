const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Dialog
  openFileDialog: () => ipcRenderer.invoke("dialog:openFile"),
  saveFileDialog: () => ipcRenderer.invoke("dialog:saveFile"),
  showMessageBox: () => ipcRenderer.invoke("dialog:messageBox"),

  // Clipboard
  clipboardRead: () => ipcRenderer.invoke("clipboard:read"),
  clipboardWrite: (text) => ipcRenderer.invoke("clipboard:write", text),

  // Notification
  showNotification: (title, body) =>
    ipcRenderer.invoke("notification:show", { title, body }),

  // System Info
  getSystemInfo: () => ipcRenderer.invoke("system:info"),

  // File I/O
  readFile: (filePath) => ipcRenderer.invoke("fs:readFile", filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke("fs:writeFile", { filePath, content }),

  // Child Window
  openChildWindow: () => ipcRenderer.invoke("window:openChild"),

  // Web Browser
  openBrowser: (url) => ipcRenderer.invoke("browser:open", url),
  getBrowserDom: () => ipcRenderer.invoke("browser:getDom"),

  // Screen Capture
  captureScreen: () => ipcRenderer.invoke("capture:screen"),

  // Monaco Editor
  openEditor: () => ipcRenderer.invoke("editor:open"),

  // Shortcuts
  registerShortcut: (accelerator) =>
    ipcRenderer.invoke("shortcut:register", accelerator),
  unregisterShortcut: (accelerator) =>
    ipcRenderer.invoke("shortcut:unregister", accelerator),
  unregisterAllShortcuts: () => ipcRenderer.invoke("shortcut:unregisterAll"),
  getAllShortcuts: () => ipcRenderer.invoke("shortcut:getAll"),
  onShortcutTriggered: (callback) =>
    ipcRenderer.on("shortcut:triggered", (_, accelerator) =>
      callback(accelerator)
    ),

  // Network Request
  netRequest: (opts) => ipcRenderer.invoke("net:request", opts),
  netIsOnline: () => ipcRenderer.invoke("net:isOnline"),

  // Shell Integration
  shellOpenExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
  shellOpenPath: (filePath) => ipcRenderer.invoke("shell:openPath", filePath),
  shellShowItemInFolder: (filePath) =>
    ipcRenderer.invoke("shell:showItemInFolder", filePath),

  // Menu action listener
  onMenuAction: (callback) =>
    ipcRenderer.on("menu-action", (_, message) => callback(message)),

  // File utilities
  getFilePath: (file) => webUtils.getPathForFile(file),
});
