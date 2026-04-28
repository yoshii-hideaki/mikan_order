# みかん酒 注文管理システム

イベント・出店向けのドリンク注文管理Webアプリです。レジ担当と厨房・バー担当の2画面で注文の受付から提供完了まで管理できます。

---

## ユーザー向け利用ガイド

### 画面構成

| 画面 | URL | 用途 |
|------|-----|------|
| レジ画面 | `/` | 注文受付・履歴確認 |
| 厨房画面 | `/kitchen` | 注文確認・ステータス管理 |

画面右上の切り替えボタンで移動できます。

---

### レジ画面の使い方

1. **メニューから商品を選ぶ**  
   左側のメニュー一覧で商品をタップすると注文リストに追加されます。数量はリスト上で増減できます。

2. **金額の自動計算**  
   合計金額は以下の料金体系で自動計算されます。

   | 杯数 | 料金 |
   |------|------|
   | 1杯  | ¥700 |
   | 2杯  | ¥1,200 |
   | 3杯  | ¥1,500 |
   | 4杯  | ¥2,200（1,500＋700） |
   | …   | 3杯ごとに¥1,500を繰り返し |

   ソフトドリンクは1杯につき **¥200引き** になります。

3. **注文を確定する**  
   右側の注文サマリーで内容を確認し「注文する」ボタンを押します。注文番号が発行されます。

4. **注文履歴の確認・編集・削除**  
   画面下部に過去の注文一覧が表示されます。注文の編集や削除も行えます。  
   CSVダウンロードボタンで注文データを書き出せます。

---

### 厨房画面の使い方

- 2秒ごとに注文が自動更新されます
- 「調理中」タブ：受付済みで未完了の注文（古い順に表示）
- 「完了」タブ：提供済みの注文（新しい順に表示）
- 各注文カードの「完了にする」ボタンでステータスを切り替えます

---

## 開発者向け情報

### 技術スタック

| 分類 | 技術 |
|------|------|
| フロントエンド | React 18, TypeScript, Vite |
| スタイル | Tailwind CSS, shadcn/ui |
| 状態管理 | Zustand, TanStack Query |
| バックエンド | Express.js, TypeScript |
| ストレージ | インメモリ（サーバー再起動でリセット） |
| 型共有 | Drizzle ORM スキーマ（shared/schema.ts） |

### ディレクトリ構造

```
mikan_order/
├── client/                  # フロントエンド
│   └── src/
│       ├── components/      # UIコンポーネント
│       │   ├── MenuGrid.tsx       # メニュー一覧
│       │   ├── OrderSummary.tsx   # 注文サマリー
│       │   ├── OrderHistory.tsx   # 注文履歴・CSV出力
│       │   ├── OrderCard.tsx      # 厨房用注文カード
│       │   └── ui/               # shadcn/ui 基本コンポーネント
│       ├── hooks/
│       │   └── use-order-store.ts # Zustandストア
│       ├── pages/
│       │   ├── RegisterView.tsx   # レジ画面
│       │   └── KitchenView.tsx    # 厨房画面
│       └── lib/
│           └── queryClient.ts     # TanStack Query設定
├── server/
│   ├── index.ts             # Expressサーバーエントリーポイント
│   ├── routes.ts            # APIルート定義
│   ├── storage.ts           # インメモリストレージ実装
│   └── vite.ts              # 開発時Viteミドルウェア
├── shared/
│   └── schema.ts            # 型定義（フロント・バック共通）
├── vite.config.ts           # Vite設定（ルートレベル）
├── drizzle.config.ts        # Drizzle設定（DB移行時に使用）
└── package.json
```

### 環境構築

**前提条件：** Node.js 20以上

```bash
# 依存関係のインストール
make install

# 開発サーバーの起動（http://localhost:3001）
make dev

# ブラウザで開く
make open
```

### Makeコマンド

| コマンド | 内容 |
|----------|------|
| `make dev` | 開発サーバーをバックグラウンドで起動 |
| `make stop` | サーバーを停止 |
| `make restart` | サーバーを再起動 |
| `make open` | ブラウザで http://localhost:3001 を開く |
| `make log` | サーバーログをリアルタイム表示 |
| `make install` | 依存関係をインストール |
| `make build` | 本番用ビルド（`dist/` に出力） |

### その他のnpmスクリプト

| コマンド | 内容 |
|----------|------|
| `npm run start` | 本番ビルドを起動 |
| `npm run check` | TypeScript型チェック |

### APIエンドポイント

| メソッド | パス | 内容 |
|----------|------|------|
| GET | `/api/menu-items` | メニュー一覧取得 |
| POST | `/api/menu-items` | メニュー追加 |
| GET | `/api/orders?withItems=true` | 注文一覧取得（商品詳細含む） |
| POST | `/api/orders` | 注文作成 |
| PATCH | `/api/orders/:id` | 注文内容更新 |
| PATCH | `/api/orders/:id/status` | ステータス更新 |
| DELETE | `/api/orders/:id` | 注文削除 |

### データの永続化について

現在はインメモリストレージを使用しており、**サーバー再起動時にデータはリセット**されます。PostgreSQLへ移行する場合は `server/storage.ts` に DB実装を追加し、`drizzle.config.ts` と `DATABASE_URL` 環境変数を設定してください。

```bash
# DB移行時（PostgreSQL使用時のみ）
DATABASE_URL=postgresql://... npm run db:push
```
