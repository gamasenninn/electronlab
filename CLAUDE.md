# Electron Lab - CLAUDE.md

## プロジェクト概要

Electron v40.x の API デモアプリ。12種類の機能をカード形式 UI で提供。
Playwright による E2E テスト（13ファイル、約60テスト）で全機能をカバー。

## 開発方式: TDD 厳守

**すべての開発は TDD（テスト駆動開発）で行う。例外なし。**

### 開発サイクル: Plan → Test → Implement → Fix（自動反復）

1. **Plan** - 機能要件を整理し、テスト項目を設計する
2. **Red** - 失敗するテストを先に書く
3. **Green** - テストを通す最小限の実装を行う
4. **Refactor** - コードを整理する
5. **テスト実行** - 全テスト通過を確認する。失敗があれば修正して再実行
6. ステップ 2〜5 を機能完成まで繰り返す

### TDD ルール

- 実装コードを書く前に、必ず失敗するテストを書く
- テストが通る最小限の実装のみ行う（過剰実装しない）
- 全テスト通過を確認してからリファクタリングする
- テストなしのコードを本番に入れない

## コマンド

```bash
npm start          # アプリ起動
npm test           # E2E テスト実行（全件）
npm run test:headed  # ブラウザ表示付きテスト
npm run test:report  # HTML レポート表示
npx playwright test tests/e2e/<file>.spec.js  # 個別テスト実行
```

## プロジェクト構造

```
electronlab/
├── main.js              # メインプロセス（IPC ハンドラ、メニュー、トレイ）
├── preload.js           # contextBridge で API を Renderer に公開
├── index.html           # UI レイアウト・CSS
├── renderer.js          # ボタンイベント処理・結果表示
├── package.json         # scripts, devDependencies のみ
├── playwright.config.js # workers:1, timeout:30s, retries:0
└── tests/e2e/
    ├── helpers/
    │   └── electron-app.js  # launchApp, closeApp, ダイアログモック5種
    ├── fixtures/
    │   ├── sample.txt       # テスト用フィクスチャ
    │   └── temp/.gitkeep    # 書き込みテスト用（afterAll でクリーンアップ）
    └── *.spec.js            # 機能別テストファイル（13ファイル）
```

ソースファイルはルート直下に配置（src/ ディレクトリなし）。

## アーキテクチャ

- **セキュリティ**: `contextIsolation: true`, `nodeIntegration: false`
- **IPC 通信**: Main ↔ Preload ↔ Renderer の3層構造
- **IPC チャンネル**: `dialog:*`, `clipboard:*`, `notification:*`, `system:*`, `fs:*`, `window:*`, `browser:*`, `capture:*`

## テスト規約（既存パターンに必ず従う）

### ファイル構成

- 1機能 = 1テストファイル (`tests/e2e/<feature>.spec.js`)
- 共通ヘルパーは `tests/e2e/helpers/electron-app.js` に集約
- テスト用固定データは `tests/e2e/fixtures/` に配置

### ライフサイクルパターン（全テスト共通）

```js
const { test, expect } = require("@playwright/test");
const { launchApp, closeApp } = require("./helpers/electron-app");

let electronApp;
let page;

test.beforeAll(async () => {
  ({ electronApp, page } = await launchApp());
});

test.afterAll(async () => {
  await closeApp(electronApp);
});
```

- `beforeAll` / `afterAll` でアプリ起動・終了（スイート単位で1回）
- `beforeEach` は使わない（Electron アプリの起動コスト回避）

### テスト設計の原則

1. **成功パスとキャンセル/失敗パスの両方をテストする**
2. **UI とメインプロセスの二重検証** - `page.locator()` + `electronApp.evaluate()`
3. **エッジケースを含める** - 空入力、特殊文字、境界値
4. **副作用のクリーンアップ** - `afterAll` で一時ファイル削除、ウィンドウ閉じ
5. **ファイル I/O は実ファイルでも検証** - `fs.existsSync` + `fs.readFileSync`

### モック戦略

- **ダイアログ**: `electronApp.evaluate()` で `dialog.*` を直接差し替え（ヘルパー関数使用）
- **IPC ハンドラ**: `ipcMain.removeHandler()` → `ipcMain.handle()` で再登録
- **ブラウザ API**: `page.evaluate()` 内で `DragEvent` / `DataTransfer` を合成

### 非同期待機の使い分け

| 方法 | 使用場面 |
|---|---|
| `page.waitForFunction()` | DOM 内容の変化を待つ |
| `electronApp.waitForEvent("window")` | 新ウィンドウの出現を待つ |
| `await expect().toContain()` 等 | Playwright の自動リトライが効く箇所 |

`page.waitForTimeout()` は原則使わない（やむを得ない場合のみ）。

### 新機能追加時のテスト手順

1. `tests/e2e/<feature>.spec.js` を作成
2. 上記ライフサイクルパターンをコピー
3. 正常系テスト → 異常系テスト → エッジケーステストの順に記述
4. ダイアログが絡む場合はヘルパーのモック関数を使用
5. 必要に応じてヘルパーに新しいモック関数を追加
6. `npm test` で全テスト通過を確認

## Playwright 設定

- `workers: 1` - Electron シングルインスタンス制約
- `timeout: 30000` - テスト全体
- `expect.timeout: 10000` - アサーション
- `retries: 0` - リトライなし（テストは確定的であるべき）
