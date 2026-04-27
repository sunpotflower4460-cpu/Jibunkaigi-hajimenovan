# じぶん会議 はじめの版

「じぶん会議」は、5つの視点で自分の言葉を見つめるための内省アプリです。

このリポジトリは、深層版へ進む前に App Store へ出しやすい軽量な初期版を作るためのものです。

## Phase 1 の目的

Phase 1 では、外部 API や Firebase に依存しない、壊れにくいアプリの器を作ります。

- Vite + React + TypeScript の土台
- 日本語UI
- スマホ優先のレイアウト
- 5人のエージェント
- 委ねる / 心の鏡
- 会話履歴
- セッション一覧
- 端末内保存
- mock AI 応答
- GitHub Actions CI
- Vercel 用設定

## Phase 1.5A の目的

この小さな更新は、GitHub Actions CI が pull request 上で実際に走るかを確認するためのものです。アプリ本体のコードは変更しません。

予算設定を更新した後、CIが再実行できるかを確認します。

Actions budget を更新した後の確認用コミットです。

## Phase 1 でやらないこと

- Gemini API の本接続
- Firebase 接続
- ログイン
- 課金
- 本番DB
- App Store 提出
- Node-AI-Z / AETERNA 接続

## 開発コマンド

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## 保存について

Phase 1 では、会話や設定はブラウザの localStorage に保存します。

初回版では、外部DBへ送らずに端末内で完結することで、提出前のリスクを下げています。

## AI接続について

Phase 1 は mock AI です。

Gemini API などの本接続は Phase 2 以降で、Vercel Serverless Function 経由にします。APIキーをブラウザ側のコードへ置かない方針です。

## 手動ゲート

以下は自動では進めません。

- Gemini API key 作成
- Vercel Environment Variables 登録
- Firebase / Supabase などの本番接続
- 認証まわり
- 課金まわり
- セキュリティルール変更
- App Store 提出
- 本番公開の最終判断

## ご利用上の注意

このアプリは自己対話と内省を助けるためのツールです。医療・診断・治療・緊急対応を目的としたものではありません。
