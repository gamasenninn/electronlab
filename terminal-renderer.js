const api = window.electronAPI;

const container = document.getElementById("terminal-container");
const statusEl = document.getElementById("terminal-status");

// Create xterm instance
const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: '"Cascadia Code", "Consolas", "Courier New", monospace',
  theme: {
    background: "#000000",
    foreground: "#e0e0e0",
  },
});

// Fit addon for auto-resize
const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);

// Open terminal in container
term.open(container);
fitAddon.fit();

// Send keyboard input to pty
term.onData((data) => {
  api.terminalInput(data);
});

// Receive pty output and write to terminal
api.onTerminalData((data) => {
  term.write(data);
});

// Handle pty exit
api.onTerminalExit((code) => {
  term.write(`\r\n[Process exited with code ${code}]\r\n`);
  statusEl.textContent = `Process exited (code: ${code})`;
});

// Handle window resize
window.addEventListener("resize", () => {
  fitAddon.fit();
  api.terminalResize(term.cols, term.rows);
});

// Set status bar with shell info
const params = new URLSearchParams(window.location.search);
const shellName = params.get("shell") || "shell";
statusEl.textContent = shellName;
