# Electron Lab

Electronの基本機能を一通り試せるインタラクティブなデモアプリケーション。

## 概要

Electron Labは、Electronが提供する主要APIを実際に操作しながら学べるPlaygroundアプリです。ダークテーマのカード形式UIで、10種類の機能をボタンクリックで試すことができます。

## 動作環境

- Node.js
- Electron v40.x

## セットアップ

```bash
cd electron-test
npm install
npm start
```

## プロジェクト構造

```
electron-test/
├── package.json      # プロジェクト設定・依存関係
├── main.js           # メインプロセス (Electronコア)
├── preload.js        # プリロードスクリプト (IPC橋渡し)
├── index.html        # レンダラー (UI・スタイル)
├── renderer.js       # レンダラープロセスのロジック
└── docs/
    └── README.md     # このドキュメント
```

### ファイルの役割

| ファイル | プロセス | 説明 |
|----------|----------|------|
| `main.js` | Main | ウィンドウ作成、IPCハンドラ登録、メニュー構築、トレイ管理 |
| `preload.js` | Preload | `contextBridge.exposeInMainWorld` でRenderer向けAPIを安全に公開 |
| `index.html` | Renderer | UIレイアウト・スタイル定義 (カードグリッド、ダークテーマ) |
| `renderer.js` | Renderer | ボタンイベント処理、結果表示ロジック |

## アーキテクチャ

```
┌─────────────────────────────────────────────┐
│  Main Process (main.js)                     │
│                                             │
│  BrowserWindow / Dialog / Clipboard /       │
│  Notification / Menu / Tray / fs            │
│         ▲                                   │
│         │ ipcMain.handle()                  │
└─────────┼───────────────────────────────────┘
          │ IPC (invoke / on)
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

## IPC チャンネル一覧

| チャンネル名 | 方向 | 説明 |
|-------------|------|------|
| `dialog:openFile` | Renderer → Main | ファイル選択ダイアログ |
| `dialog:saveFile` | Renderer → Main | ファイル保存ダイアログ |
| `dialog:messageBox` | Renderer → Main | メッセージボックス |
| `clipboard:read` | Renderer → Main | クリップボード読み取り |
| `clipboard:write` | Renderer → Main | クリップボード書き込み |
| `notification:show` | Renderer → Main | 通知送信 |
| `system:info` | Renderer → Main | システム情報取得 |
| `fs:readFile` | Renderer → Main | ファイル読み込み |
| `fs:writeFile` | Renderer → Main | ファイル書き込み |
| `window:openChild` | Renderer → Main | 子ウィンドウ生成 |
| `capture:screen` | Renderer → Main | 画面キャプチャ |
| `menu-action` | Main → Renderer | メニュー操作の通知 |

## UI

- **テーマ**: ダークテーマ (背景 `#1a1a2e`、カード `#16213e`、アクセント `#e94560`)
- **レイアウト**: レスポンシブグリッド (`grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))`)
- **カード構成**: 番号バッジ、タイトル、API名タグ、操作ボタン、結果表示エリア
- **フォント**: Segoe UI (UI) / Cascadia Code (結果表示)

## セキュリティ

- `contextIsolation: true` — Renderer と Preload のコンテキストを分離
- `nodeIntegration: false` — Renderer から Node.js API への直接アクセスを無効化
- Content Security Policy を `<meta>` タグで設定
- すべてのNode.js操作は IPC (`invoke`/`handle`) 経由で実行
