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
