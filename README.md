# レシート管理アプリ

スマホで撮影したレシート画像をClaude Vision APIでOCR解析し、店名・日付・合計金額・品目を抽出してSQLiteに保存、一覧表示するWebアプリ。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS
- **DB**: SQLite (Prisma 7 + better-sqlite3)
- **OCR**: Claude Vision API (claude-haiku-4-5)

## セットアップ

```bash
npm install

# .env.local にAPIキーを設定
# ANTHROPIC_API_KEY=your_api_key_here

# DBマイグレーション（初回のみ）
npx prisma migrate dev

npm run dev
```

## 機能

- レシート画像アップロード（JPG / PNG / WEBP）
- Claude Vision APIによる自動OCR解析
  - 店名・日付・合計金額・品目を抽出
- SQLiteへの保存
- レシート一覧表示（品目展開・削除機能）
- 合計支出の集計表示
