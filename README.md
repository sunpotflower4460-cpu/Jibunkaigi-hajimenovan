# じぶん会議 はじめの版

「じぶん会議」は、5つの視点で自分の言葉を見つめるための内省アプリです。

このリポジトリは、深層版へ進む前に App Store へ出しやすい軽量な初期版を作るためのものです。

## 現在の状態

- Vite + React + TypeScript
- 日本語UI
- スマホ優先のレイアウト
- 5人のエージェント
- 委ねる / 心の鏡
- 会話履歴
- セッション一覧
- 端末内保存（localStorage + IndexedDB）
- **mock AI 応答**（生成AI本接続は今後のフェーズで対応）
- Firebase環境変数が未設定の場合は端末内保存のみで動作
- GitHub Actions CI（typecheck / build）
- Vercel 用設定

**現在の起動正本は `AppStable.tsx` です。**（`App.tsx` は旧版/退避用）

## Phase 1.5 で完了した安定化

### Phase 1.5A: CI実走確認

GitHub Actions CI が pull request 上で実際に走り、以下が成功する状態にしました。

- npm install
- npm run typecheck
- npm run build

### Phase 1.5B: 起動時・保存データ安定化

- 画面が真っ白にならないよう ErrorBoundary を追加
- 壊れた localStorage データを読み飛ばす
- 孤立したメッセージや空データを除外する
- 保存件数に上限を持たせて初期版の安定性を上げる

### Phase 1.5C: スマホ操作・生成中状態の安定化

- 生成中のセッション切替・削除・二重操作を抑制
- 生成開始時の sessionId を固定し、別セッションへ誤保存しない
- 生成中はモード変更や削除操作を止める
- iPhone下部の safe-area に合わせて余白を確保
- 長い単語や長文メッセージの折り返しを強化
- 初期版用の安定Appシェルを追加し、既存Appは残して差し戻し可能にする

## Phase 1.6: 端末内保存の強化

初期版ではクラウド保存ではなく、端末内保存を強化しています。

- localStorage に保存
- IndexedDB にも同じ状態を保存
- 起動時に IndexedDB 側の保存が新しければ localStorage へ復元
- ログインなしで端末内に残る設計

注意: これはクラウド同期ではありません。別端末・別ブラウザには引き継がれません。Safariやアプリ内ブラウザのサイトデータを削除した場合、保存データが消える可能性があります。

## Phase 2A: Firebaseクラウド保存の設計

クラウド保存へ進むための設計は `docs/firebase-cloud-save-design.md` にまとめています。

Phase 2AではまだFirebase実接続は行わず、匿名ログイン・Firestore保存構造・端末内保存との同期方針・手動ゲート・セキュリティ方針を固定しました。

## Phase 2B: 任意のFirebaseクラウド保存

Firebase環境変数が未設定の場合は、これまで通り端末内保存だけで動きます。

Firebase環境変数が設定されている場合だけ、匿名ログインとFirestore同期を開始します。

- Firebase SDKを追加
- 未設定時は端末内保存のみ
- 設定済み時だけ匿名ログイン
- Firestoreへアプリ状態をdebounce保存
- 起動時にクラウド側が新しければ端末内へ復元
- 画面右下に保存状態バッジを表示
- `.env.example` を追加
- 手動セットアップ手順は `docs/firebase-manual-setup.md`

## 初期版でやらないこと

- Gemini API の本接続
- ログインUI
- 課金
- App Store 提出
- Node-AI-Z / AETERNA 接続

## 開発コマンド

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

**CIの必須チェック（現時点）**

- `npm run typecheck` — TypeScript型エラーがないこと
- `npm run build` — Viteビルドが成功すること

ESLint・Vitestは次フェーズ以降のTODOです。

## 保存について

初期版では、会話や設定を localStorage と IndexedDB の両方へ保存します。

Firebase環境変数を登録した場合のみ、Firestoreにも保存します。将来的には、設定画面から保存状態やデータ削除導線を整える予定です。

## AI接続について

初期版は mock AI です。

Gemini API などの本接続は Phase 2 以降で、Vercel Serverless Function 経由にします。APIキーをブラウザ側のコードへ置かない方針です。

## 手動ゲート

以下は自動では進めません。

- Gemini API key 作成
- Firebase project作成
- Firebase Authentication匿名ログイン有効化
- Firestore Database作成
- Firestore rules設定
- Vercel Environment Variables 登録
- 認証まわりの本番判断
- 課金まわり
- セキュリティルール変更
- App Store 提出
- 本番公開の最終判断

## QAチェックリスト

提出前・実機確認前のチェック項目は `docs/qa-checklist.md` を参照してください。

## ご利用上の注意

このアプリは自己対話と内省を助けるためのツールです。医療・診断・治療・緊急対応を目的としたものではありません。
