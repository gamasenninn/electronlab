# Electron Lab

Electronの基本機能を一通り試せるインタラクティブなデモアプリケーション。

## 概要

Electron Labは、Electronが提供する主要APIを実際に操作しながら学べるPlaygroundアプリです。ダークテーマのカード形式UIで、18種類の機能をボタンクリックで試すことができます。

![Main Overview](docs/screenshots/main-overview.png)

## 動作環境

- Node.js v18+
- Electron v40.x

## セットアップ

```bash
cd electronlab
npm install
npm start
```

## テスト

Playwright による E2E テスト（19ファイル、105テスト）で全機能をカバーしています。

```bash
npm test              # E2E テスト実行（全件）
npm run test:headed   # ブラウザ表示付きテスト
npm run test:report   # HTML レポート表示
npx playwright test tests/e2e/<file>.spec.js  # 個別テスト実行
```

## ドキュメント生成

スクリーンショット付きドキュメントを Playwright で自動生成します。

```bash
npm run docs          # スクリーンショット撮影 + FEATURES.md 生成
```

生成物は `docs/screenshots/` と `docs/FEATURES.md` に出力されます。

## プロジェクト構造

```
electronlab/
├── main.js              # メインプロセス（IPC ハンドラ、メニュー、トレイ）
├── preload.js           # contextBridge で API を Renderer に公開
├── index.html           # UI レイアウト・CSS
├── renderer.js          # ボタンイベント処理・結果表示
├── editor.html          # Monaco Editor 子ウィンドウ
├── editor-renderer.js   # Monaco Editor 初期化・ファイル操作
├── sqlite.html          # SQL Console 子ウィンドウ
├── sqlite-renderer.js   # SQLite クエリ実行 UI
├── terminal.html        # Terminal 子ウィンドウ
├── terminal-renderer.js # xterm.js 初期化・IPC 接続
├── package.json         # scripts, dependencies
├── playwright.config.js # workers:1, timeout:30s, retries:0
├── docs/
│   ├── generate-docs.spec.js      # スクリーンショット自動生成
│   ├── playwright.docs.config.js  # docs 用 Playwright 設定
│   ├── FEATURES.md                # 機能紹介ドキュメント
│   └── screenshots/               # 自動生成スクリーンショット
└── tests/e2e/
    ├── helpers/
    │   └── electron-app.js  # launchApp, closeApp, ダイアログモック等
    ├── fixtures/
    │   ├── sample.txt       # テスト用フィクスチャ
    │   ├── sample.js        # Monaco Editor テスト用
    │   └── temp/.gitkeep    # 書き込みテスト用（afterAll でクリーンアップ）
    └── *.spec.js            # 機能別テストファイル（19ファイル）
```

### ファイルの役割

| ファイル | プロセス | 説明 |
|----------|----------|------|
| `main.js` | Main | ウィンドウ作成、IPCハンドラ登録、メニュー構築、トレイ管理 |
| `preload.js` | Preload | `contextBridge.exposeInMainWorld` でRenderer向けAPIを安全に公開 |
| `index.html` | Renderer | UIレイアウト・スタイル定義 (カードグリッド、ダークテーマ) |
| `renderer.js` | Renderer | ボタンイベント処理、結果表示ロジック |
| `editor.html` / `editor-renderer.js` | Renderer (子) | Monaco Editor 子ウィンドウ |
| `sqlite.html` / `sqlite-renderer.js` | Renderer (子) | SQL Console 子ウィンドウ |
| `terminal.html` / `terminal-renderer.js` | Renderer (子) | Terminal 子ウィンドウ |

## アーキテクチャ

```
┌─────────────────────────────────────────────┐
│  Main Process (main.js)                     │
│                                             │
│  BrowserWindow / Dialog / Clipboard /       │
│  Notification / Menu / Tray / fs /          │
│  net / globalShortcut / shell /             │
│  better-sqlite3 / node-pty                  │
│         ▲                                   │
│         │ ipcMain.handle() / ipcMain.on()   │
└─────────┼───────────────────────────────────┘
          │ IPC (invoke / send)
┌─────────┼───────────────────────────────────┐
│  Preload (preload.js)                       │
│         │                                   │
│  contextBridge.exposeInMainWorld()          │
│  → window.electronAPI として公開             │
└─────────┼───────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────┐
│  Renderer Process (renderer.js + HTML)      │
│         ▼                                   │
│  window.electronAPI.xxx() で呼び出し         │
│  結果をカード内の .result エリアに表示        │
└─────────────────────────────────────────────┘
```

- `contextIsolation: true` / `nodeIntegration: false` のセキュアな構成
- Renderer から Main への通信はすべて `ipcRenderer.invoke` → `ipcMain.handle` パターン
- Main から Renderer への通知は `webContents.send` → `ipcRenderer.on` パターン
- fire-and-forget 通信は `ipcRenderer.send` → `ipcMain.on` パターン（Terminal input/resize）

## 機能一覧

### 1. Window Info
- **使用API**: `BrowserWindow` (Renderer側は `window` プロパティ)
- **内容**: ウィンドウサイズ、位置、devicePixelRatio、UserAgentを表示
- **操作**: "Get Window Info" ボタンをクリック

### 2. Dialogs
- **使用API**: `dialog.showOpenDialog`, `dialog.showSaveDialog`, `dialog.showMessageBox`
- **内容**: 3種類のネイティブダイアログを表示
- **操作**:
  - "Open File" — ファイル選択ダイアログ
  - "Save File" — ファイル保存ダイアログ
  - "Message Box" — 3ボタン付きメッセージボックス

### 3. Clipboard
- **使用API**: `clipboard.readText`, `clipboard.writeText`
- **内容**: システムクリップボードの読み書き
- **操作**:
  - テキストを入力して "Copy" — クリップボードに書き込み
  - "Read Clipboard" — 現在のクリップボード内容を表示

### 4. Desktop Notification
- **使用API**: `Notification`
- **内容**: OSのデスクトップ通知を送信
- **操作**: タイトルと本文を入力して "Send Notification" をクリック

### 5. System Info
- **使用API**: `process`, `os`, `app`
- **内容**: OS、CPU、メモリ、Node.js/Electron/Chromeバージョン、アプリパス等を表示
- **操作**: "Get System Info" ボタンをクリック

### 6. Custom Menu
- **使用API**: `Menu`, `Menu.buildFromTemplate`
- **内容**: アプリケーションメニューバーをカスタマイズ
- **メニュー構成**:
  - File → Open File... (Ctrl+O), Quit
  - View → Reload, DevTools, Zoom
  - Help → About Electron Lab

### 7. System Tray
- **使用API**: `Tray`, `nativeImage`
- **内容**: システムトレイにアイコンを配置
- **操作**: トレイアイコンを右クリックでコンテキストメニュー表示
  - "Show Window" — ウィンドウを前面に
  - "Notification Test" — トレイからの通知送信
  - "Quit" — アプリ終了

### 8. File Read / Write
- **使用API**: `fs.readFileSync`, `fs.writeFileSync` (IPC経由)
- **内容**: Node.jsのfsモジュールをIPC経由で安全に利用
- **操作**:
  - "Read File..." — ファイル選択→内容表示 (500文字まで)
  - "Write Test File" — 保存先選択→テストファイル書き込み

### 9. Child Window
- **使用API**: `BrowserWindow` (parent オプション)
- **内容**: メインウィンドウの子ウィンドウを生成
- **操作**: "Open Child Window" で新しいウィンドウが開く

### 10. Screen Capture
- **使用API**: `desktopCapturer.getSources`
- **内容**: デスクトップ画面とウィンドウのサムネイルをキャプチャ
- **操作**: "Capture Screens" で利用可能なソースの一覧とサムネイルを表示

### 11. Drag & Drop
- **使用API**: `webUtils.getPathForFile`, `fs.readFileSync` (IPC経由)
- **内容**: ファイルをドロップゾーンにドラッグ＆ドロップし、ファイル情報と内容を表示
- **操作**: ファイルをドロップゾーンにドラッグ＆ドロップ
  - ファイル名・サイズ・タイプを表示
  - テキストファイルの内容をプレビュー (500文字まで)

### 12. Web Browser
- **使用API**: `BrowserWindow`, `webContents.executeJavaScript`
- **内容**: URLを入力してBrowserWindowで開き、ページのDOMを取得して表示
- **操作**:
  - URLを入力して "Open" — 新しいBrowserWindowでページを開く
  - "Get DOM" — 開いているページのDOM (outerHTML) を取得して結果エリアに表示

### 13. Shortcuts
- **使用API**: `globalShortcut.register`, `globalShortcut.unregister`
- **内容**: グローバルショートカットキーの登録・解除・一覧表示
- **操作**:
  - キーの組み合わせを入力して "Register" — ショートカット登録
  - "Unregister" — 個別解除
  - "Unregister All" — 全解除
  - "Get All" — 登録済みショートカット一覧表示

### 14. Shell Integration
- **使用API**: `shell.openExternal`, `shell.openPath`, `shell.showItemInFolder`
- **内容**: OS標準のブラウザ・ファイルマネージャーとの連携
- **操作**:
  - "Open in Browser" — URLをデフォルトブラウザで開く (http/https のみ)
  - "Open Folder" — ファイルをOS標準アプリで開く
  - "Show in Folder" — ファイルをエクスプローラーで表示

### 15. Monaco Editor
- **使用API**: `BrowserWindow`, `ipcMain.handle()`, `dialog`, `monaco-editor`
- **内容**: VS Code と同じエディタエンジンを子ウィンドウで起動
- **操作**:
  - "Open Editor" — エディタウィンドウを開く
  - ファイルの読み込み・保存、シンタックスハイライト、言語切り替えに対応

### 16. Network Request
- **使用API**: `net.request`, `net.isOnline`
- **内容**: Electron の net モジュールで HTTP リクエストを送信
- **操作**:
  - URL・メソッド・ヘッダ・ボディを指定して "Send Request"
  - "Check Online" — ネットワーク接続状態を確認

### 17. SQLite Database
- **使用API**: `better-sqlite3`, `ipcMain.handle()`
- **内容**: SQLite データベースの作成・接続と SQL コンソール
- **操作**:
  - "Open Database" — データベースファイルを開く
  - "Open SQL Console" — SQL コンソール子ウィンドウで CREATE TABLE / INSERT / SELECT 等を実行

### 18. Terminal
- **使用API**: `node-pty`, `xterm.js`, `BrowserWindow`, `ipcMain`
- **内容**: インタラクティブなターミナルを子ウィンドウに組み込み
- **操作**:
  - "Open Terminal" — ターミナルウィンドウを開く
  - PowerShell（Windows）/ bash（macOS/Linux）が起動し、実際のシェル操作が可能
  - ウィンドウリサイズに自動追従、プロセス終了時のクリーンアップ対応

## IPC チャンネル一覧

| チャンネル名 | 方向 | メソッド | 説明 |
|-------------|------|----------|------|
| `dialog:openFile` | Renderer → Main | invoke/handle | ファイル選択ダイアログ |
| `dialog:saveFile` | Renderer → Main | invoke/handle | ファイル保存ダイアログ |
| `dialog:messageBox` | Renderer → Main | invoke/handle | メッセージボックス |
| `clipboard:read` | Renderer → Main | invoke/handle | クリップボード読み取り |
| `clipboard:write` | Renderer → Main | invoke/handle | クリップボード書き込み |
| `notification:show` | Renderer → Main | invoke/handle | 通知送信 |
| `system:info` | Renderer → Main | invoke/handle | システム情報取得 |
| `fs:readFile` | Renderer → Main | invoke/handle | ファイル読み込み |
| `fs:writeFile` | Renderer → Main | invoke/handle | ファイル書き込み |
| `window:openChild` | Renderer → Main | invoke/handle | 子ウィンドウ生成 |
| `capture:screen` | Renderer → Main | invoke/handle | 画面キャプチャ |
| `browser:open` | Renderer → Main | invoke/handle | URLをBrowserWindowで開く |
| `browser:getDom` | Renderer → Main | invoke/handle | ブラウザウィンドウのDOM取得 |
| `shortcut:register` | Renderer → Main | invoke/handle | ショートカット登録 |
| `shortcut:unregister` | Renderer → Main | invoke/handle | ショートカット解除 |
| `shortcut:unregisterAll` | Renderer → Main | invoke/handle | 全ショートカット解除 |
| `shortcut:getAll` | Renderer → Main | invoke/handle | 登録済みショートカット取得 |
| `shortcut:triggered` | Main → Renderer | send/on | ショートカット発火通知 |
| `shell:openExternal` | Renderer → Main | invoke/handle | 外部ブラウザでURL表示 |
| `shell:openPath` | Renderer → Main | invoke/handle | OS標準アプリで開く |
| `shell:showItemInFolder` | Renderer → Main | invoke/handle | エクスプローラーで表示 |
| `net:request` | Renderer → Main | invoke/handle | HTTPリクエスト送信 |
| `net:isOnline` | Renderer → Main | invoke/handle | オンライン状態確認 |
| `editor:open` | Renderer → Main | invoke/handle | Monaco Editor 起動 |
| `db:open` | Renderer → Main | invoke/handle | データベース接続 |
| `db:close` | Renderer → Main | invoke/handle | データベース切断 |
| `db:execute` | Renderer → Main | invoke/handle | SQL実行 |
| `db:tables` | Renderer → Main | invoke/handle | テーブル一覧取得 |
| `db:openConsole` | Renderer → Main | invoke/handle | SQLコンソール起動 |
| `terminal:open` | Renderer → Main | invoke/handle | ターミナル起動 |
| `terminal:input` | Renderer → Main | send/on | キー入力を pty へ転送 |
| `terminal:resize` | Renderer → Main | send/on | ターミナルサイズ同期 |
| `terminal:data` | Main → Renderer | send/on | pty 出力をブラウザへ |
| `terminal:exit` | Main → Renderer | send/on | プロセス終了通知 |
| `menu-action` | Main → Renderer | send/on | メニュー操作の通知 |

## UI

- **テーマ**: ダークテーマ (背景 `#1a1a2e`、カード `#16213e`、アクセント `#e94560`)
- **レイアウト**: レスポンシブグリッド (`grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))`)
- **カード構成**: 番号バッジ、タイトル、API名タグ、操作ボタン、結果表示エリア
- **フォント**: Segoe UI (UI) / Cascadia Code (結果表示)

## セキュリティ

- `contextIsolation: true` — Renderer と Preload のコンテキストを分離
- `nodeIntegration: false` — Renderer から Node.js API への直接アクセスを無効化
- Content Security Policy を `<meta>` タグで設定
- すべてのNode.js操作は IPC (`invoke`/`handle` または `send`/`on`) 経由で実行
- `shell:openExternal` は `http` / `https` プロトコルのみ許可
