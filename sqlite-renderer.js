const api = window.electronAPI;

function $(id) {
  return document.getElementById(id);
}

// --- Open DB ---
$("btn-db-open").addEventListener("click", async () => {
  const dialogResult = await api.openFileDialog();
  if (dialogResult.canceled) return;
  const filePath = dialogResult.filePaths[0];
  const result = await api.dbOpen(filePath);
  if (result.success) {
    const fileName = filePath.split(/[\\/]/).pop();
    $("db-status").textContent = `Connected: ${fileName}`;
  } else {
    $("db-status").textContent = `Error: ${result.error}`;
  }
});

// --- Close DB ---
$("btn-db-close").addEventListener("click", async () => {
  const result = await api.dbClose();
  if (result.success) {
    $("db-status").textContent = "No database connected";
  } else {
    $("db-status").textContent = `Error: ${result.error}`;
  }
});

// --- Execute SQL ---
$("btn-sql-execute").addEventListener("click", async () => {
  const sql = $("sql-input").value.trim();
  if (!sql) {
    $("sql-status").textContent = "Please enter a SQL statement.";
    return;
  }

  const result = await api.dbExecute(sql);
  if (!result.success) {
    $("sql-status").textContent = `Error: ${result.error}`;
    $("sql-result").textContent = "";
    return;
  }

  if (result.columns) {
    // SELECT result - render table
    renderTable(result.columns, result.rows);
    $("sql-status").textContent = `${result.rows.length} row(s) returned`;
  } else {
    // Non-SELECT result
    $("sql-result").textContent = "";
    $("sql-status").textContent = `${result.changes} changes`;
  }
});

// --- List Tables ---
$("btn-sql-tables").addEventListener("click", async () => {
  const result = await api.dbTables();
  if (!result.success) {
    $("sql-status").textContent = `Error: ${result.error}`;
    $("sql-result").textContent = "";
    return;
  }

  if (result.tables.length === 0) {
    $("sql-result").textContent = "No tables found.";
    $("sql-status").textContent = "0 tables";
  } else {
    renderTable(["Table Name"], result.tables.map((t) => ({ "Table Name": t })));
    $("sql-status").textContent = `${result.tables.length} table(s)`;
  }
});

// --- Render HTML table ---
function renderTable(columns, rows) {
  let html = "<table><thead><tr>";
  for (const col of columns) {
    html += `<th>${escapeHtml(col)}</th>`;
  }
  html += "</tr></thead><tbody>";
  for (const row of rows) {
    html += "<tr>";
    for (const col of columns) {
      const val = row[col];
      html += `<td>${escapeHtml(val === null ? "NULL" : String(val))}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  $("sql-result").innerHTML = html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
