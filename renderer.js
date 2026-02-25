const api = window.electronAPI;

function $(id) {
  return document.getElementById(id);
}

function setResult(id, text) {
  $(id).textContent = typeof text === "string" ? text : JSON.stringify(text, null, 2);
}

function setResultHTML(id, html) {
  $(id).innerHTML = html;
}

// #1 Window Info
$("btn-window-info").addEventListener("click", () => {
  const info = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    screenX: window.screenX,
    screenY: window.screenY,
    devicePixelRatio: window.devicePixelRatio,
    userAgent: navigator.userAgent,
  };
  setResult("result-window", info);
});

// #2 Dialogs
$("btn-dialog-open").addEventListener("click", async () => {
  const result = await api.openFileDialog();
  if (result.canceled) {
    setResult("result-dialog", "Dialog was canceled.");
  } else {
    setResult("result-dialog", `Selected: ${result.filePaths.join(", ")}`);
  }
});

$("btn-dialog-save").addEventListener("click", async () => {
  const result = await api.saveFileDialog();
  if (result.canceled) {
    setResult("result-dialog", "Save dialog was canceled.");
  } else {
    setResult("result-dialog", `Save path: ${result.filePath}`);
  }
});

$("btn-dialog-msg").addEventListener("click", async () => {
  const result = await api.showMessageBox();
  setResult("result-dialog", `Button clicked: "${result.button}" (index: ${result.response})`);
});

// #3 Clipboard
$("btn-clipboard-write").addEventListener("click", async () => {
  const text = $("clipboard-input").value || "Hello from Electron Lab!";
  await api.clipboardWrite(text);
  setResult("result-clipboard", `Copied to clipboard: "${text}"`);
});

$("btn-clipboard-read").addEventListener("click", async () => {
  const text = await api.clipboardRead();
  setResult("result-clipboard", `Clipboard content:\n${text}`);
});

// #4 Notification
$("btn-notif").addEventListener("click", async () => {
  const title = $("notif-title").value || "Notification";
  const body = $("notif-body").value || "Hello!";
  await api.showNotification(title, body);
  setResult("result-notif", `Notification sent: "${title}"`);
});

// #5 System Info
$("btn-sysinfo").addEventListener("click", async () => {
  const info = await api.getSystemInfo();
  const lines = Object.entries(info)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  setResult("result-sysinfo", lines);
});

// #6 Menu actions (received from main process)
api.onMenuAction((message) => {
  setResult("result-menu", `Menu action: ${message}`);
});

// #8 File I/O
$("btn-file-read").addEventListener("click", async () => {
  const dialogResult = await api.openFileDialog();
  if (dialogResult.canceled) {
    setResult("result-file", "File selection canceled.");
    return;
  }
  const filePath = dialogResult.filePaths[0];
  const result = await api.readFile(filePath);
  if (result.success) {
    const preview =
      result.content.length > 500
        ? result.content.substring(0, 500) + "\n... (truncated)"
        : result.content;
    setResult("result-file", `File: ${filePath}\n\n${preview}`);
  } else {
    setResult("result-file", `Error: ${result.error}`);
  }
});

$("btn-file-write").addEventListener("click", async () => {
  const dialogResult = await api.saveFileDialog();
  if (dialogResult.canceled) {
    setResult("result-file", "Save canceled.");
    return;
  }
  const content = `Hello from Electron Lab!\nWritten at: ${new Date().toISOString()}\n`;
  const result = await api.writeFile(dialogResult.filePath, content);
  if (result.success) {
    setResult("result-file", `File written: ${dialogResult.filePath}`);
  } else {
    setResult("result-file", `Error: ${result.error}`);
  }
});

// #9 Child Window
$("btn-child-window").addEventListener("click", async () => {
  const result = await api.openChildWindow();
  setResult("result-child", `Child window opened (ID: ${result.id})`);
});

// #10 Screen Capture
$("btn-capture").addEventListener("click", async () => {
  setResult("result-capture", "Capturing...");
  const sources = await api.captureScreen();
  if (sources.error) {
    setResult("result-capture", `Error: ${sources.error}`);
    return;
  }
  const html = sources
    .map(
      (s) =>
        `<div style="margin-bottom:8px;">
          <strong>${s.name}</strong> <span style="color:#666;">(${s.id})</span><br/>
          <img src="${s.thumbnail}" alt="${s.name}" />
        </div>`
    )
    .join("");
  setResultHTML("result-capture", html || "No sources found.");
});

// #11 Drag & Drop
const dropZone = $("drop-zone");

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (!file) return;

  const info = `Name: ${file.name}\nSize: ${file.size} bytes\nType: ${file.type || "unknown"}`;

  const filePath = api.getFilePath(file);
  const result = await api.readFile(filePath);
  if (result.success) {
    const preview =
      result.content.length > 500
        ? result.content.substring(0, 500) + "\n... (truncated)"
        : result.content;
    setResult("result-drop", `${info}\n\n--- Content ---\n${preview}`);
  } else {
    setResult("result-drop", `${info}\n\nError reading file: ${result.error}`);
  }
});

// #12 Web Browser
$("btn-browser-open").addEventListener("click", async () => {
  const url = $("browser-url").value.trim();
  if (!url) {
    setResult("result-browser", "Please enter a URL.");
    return;
  }
  try {
    const result = await api.openBrowser(url);
    setResult("result-browser", `Browser opened (ID: ${result.id})`);
  } catch (err) {
    setResult("result-browser", `Error: ${err.message}`);
  }
});

// #13 Shortcuts
$("btn-shortcut-register").addEventListener("click", async () => {
  const accelerator = $("shortcut-input").value.trim();
  if (!accelerator) {
    setResult("result-shortcut", "Please enter a shortcut key combination.");
    return;
  }
  const result = await api.registerShortcut(accelerator);
  if (result.success) {
    setResult("result-shortcut", `Registered: ${accelerator}`);
  } else {
    setResult("result-shortcut", `Error: ${result.error}`);
  }
});

$("btn-shortcut-unregister").addEventListener("click", async () => {
  const accelerator = $("shortcut-input").value.trim();
  if (!accelerator) {
    setResult("result-shortcut", "Please enter a shortcut key combination.");
    return;
  }
  const result = await api.unregisterShortcut(accelerator);
  if (result.success) {
    setResult("result-shortcut", `Unregistered: ${accelerator}`);
  } else {
    setResult("result-shortcut", `Error: ${result.error}`);
  }
});

$("btn-shortcut-unregisterall").addEventListener("click", async () => {
  const result = await api.unregisterAllShortcuts();
  if (result.success) {
    setResult("result-shortcut", "All unregistered.");
  } else {
    setResult("result-shortcut", `Error: ${result.error}`);
  }
});

$("btn-shortcut-getall").addEventListener("click", async () => {
  const result = await api.getAllShortcuts();
  if (result.shortcuts.length === 0) {
    setResult("result-shortcut", "No shortcuts registered.");
  } else {
    setResult("result-shortcut", `Registered shortcuts:\n${result.shortcuts.join("\n")}`);
  }
});

api.onShortcutTriggered((accelerator) => {
  setResult("result-shortcut", `Triggered: ${accelerator}`);
});

// #14 Shell Integration
$("btn-shell-open-url").addEventListener("click", async () => {
  const url = $("shell-url").value.trim();
  if (!url) {
    setResult("result-shell", "Please enter a URL.");
    return;
  }
  const result = await api.shellOpenExternal(url);
  if (result.success) {
    setResult("result-shell", `Opened: ${url}`);
  } else {
    setResult("result-shell", `Error: ${result.error}`);
  }
});

$("btn-shell-open-folder").addEventListener("click", async () => {
  const dialogResult = await api.openFileDialog();
  if (dialogResult.canceled) {
    setResult("result-shell", "Folder selection canceled.");
    return;
  }
  const folderPath = dialogResult.filePaths[0];
  const result = await api.shellOpenPath(folderPath);
  if (result.success) {
    setResult("result-shell", `Opened: ${folderPath}`);
  } else {
    setResult("result-shell", `Error: ${result.error}`);
  }
});

$("btn-shell-show-folder").addEventListener("click", async () => {
  const dialogResult = await api.openFileDialog();
  if (dialogResult.canceled) {
    setResult("result-shell", "File selection canceled.");
    return;
  }
  const filePath = dialogResult.filePaths[0];
  const result = await api.shellShowItemInFolder(filePath);
  if (result.success) {
    setResult("result-shell", `Shown in folder: ${filePath}`);
  } else {
    setResult("result-shell", `Error: ${result.error}`);
  }
});

// #16 Network Request
$("btn-net-send").addEventListener("click", async () => {
  const url = $("net-url").value.trim();
  if (!url) {
    setResult("result-net", "Please enter a URL.");
    return;
  }

  const method = $("net-method").value;
  const headersStr = $("net-headers").value.trim();

  let headers = {};
  if (headersStr && headersStr !== "{}") {
    try {
      headers = JSON.parse(headersStr);
    } catch {
      setResult("result-net", "Invalid JSON in headers field.");
      return;
    }
  }

  const body = $("net-body").value;

  setResult("result-net", "Sending...");
  const result = await api.netRequest({ url, method, headers, body });
  if (result.success) {
    const headerLines = Object.entries(result.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    const bodyPreview =
      result.body.length > 2000
        ? result.body.substring(0, 2000) + "\n... (truncated)"
        : result.body;
    setResult(
      "result-net",
      `Status: ${result.status} ${result.statusText}\n\n--- Headers ---\n${headerLines}\n\n--- Body ---\n${bodyPreview}`
    );
  } else {
    setResult("result-net", `Error: ${result.error}`);
  }
});

$("btn-net-online").addEventListener("click", async () => {
  const result = await api.netIsOnline();
  setResult("result-net", result.online ? "Online" : "Offline");
});

// #15 Monaco Editor
$("btn-editor-open").addEventListener("click", async () => {
  try {
    const result = await api.openEditor();
    setResult("result-editor", `Editor opened (ID: ${result.id})`);
  } catch (err) {
    setResult("result-editor", `Error: ${err.message}`);
  }
});

$("btn-browser-dom").addEventListener("click", async () => {
  const result = await api.getBrowserDom();
  if (result.success) {
    const preview =
      result.dom.length > 2000
        ? result.dom.substring(0, 2000) + "\n... (truncated)"
        : result.dom;
    setResult("result-browser", preview);
  } else {
    setResult("result-browser", `Error: ${result.error}`);
  }
});
