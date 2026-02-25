const api = window.electronAPI;

function $(id) {
  return document.getElementById(id);
}

function setStatus(text) {
  $("editor-status").textContent = text;
}

// Extension to Monaco language ID mapping
function getLanguageFromPath(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  const map = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    json: "json",
    html: "html",
    htm: "html",
    css: "css",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sh: "shell",
    bat: "bat",
    ps1: "powershell",
    sql: "sql",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    rb: "ruby",
    php: "php",
  };
  return map[ext] || "plaintext";
}

// Configure Monaco AMD loader
require.config({
  paths: { vs: "node_modules/monaco-editor/min/vs" },
});

require(["vs/editor/editor.main"], function () {
  const editor = monaco.editor.create($("editor-container"), {
    value: "",
    language: "plaintext",
    theme: "vs-dark",
    automaticLayout: true,
    fontSize: 14,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
  });

  // Expose for E2E tests
  window.monacoEditorInstance = editor;

  // --- Open File ---
  $("btn-editor-open-file").addEventListener("click", async () => {
    const dialogResult = await api.openFileDialog();
    if (dialogResult.canceled) {
      return;
    }
    const filePath = dialogResult.filePaths[0];
    const result = await api.readFile(filePath);
    if (result.success) {
      const lang = getLanguageFromPath(filePath);
      editor.setValue(result.content);
      monaco.editor.setModelLanguage(editor.getModel(), lang);
      $("language-select").value = lang;
      setStatus(`Opened: ${filePath}`);
    } else {
      setStatus(`Error: ${result.error}`);
    }
  });

  // --- Save File ---
  $("btn-editor-save").addEventListener("click", async () => {
    const dialogResult = await api.saveFileDialog();
    if (dialogResult.canceled) {
      setStatus("Save canceled");
      return;
    }
    const content = editor.getValue();
    const result = await api.writeFile(dialogResult.filePath, content);
    if (result.success) {
      setStatus(`Saved: ${dialogResult.filePath}`);
    } else {
      setStatus(`Error: ${result.error}`);
    }
  });

  // --- Language switch ---
  $("language-select").addEventListener("change", () => {
    const lang = $("language-select").value;
    monaco.editor.setModelLanguage(editor.getModel(), lang);
    setStatus(`Language: ${lang}`);
  });
});
