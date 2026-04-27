# Phase 2A: Firebase匿名ログイン + Firestoreクラウド保存 設計

このドキュメントは、じぶん会議 はじめの版をクラウド保存へ進めるための設計メモです。

Phase 2Aでは、まだFirebase実接続は行いません。先に保存方針・データ構造・手動ゲート・セキュリティ方針を固定します。

## 目的

- 同じユーザーが別端末や再インストール後でも会話履歴を復元できるようにする
- 現在の端末内保存 localStorage + IndexedDB をバックアップとして残す
- Firebase匿名ログインで、メール登録なしでもクラウド保存できるようにする
- ユーザーの内省データを扱うため、Firestore rules とプライバシー方針を最初から慎重にする

## 現在の保存状態

現在はクラウド保存ではありません。

- localStorage
- IndexedDB
- 同じ端末・同じブラウザでは残りやすい
- 別端末・別ブラウザには引き継がれない

## Phase 2で目指す保存構造

### 基本方針

1. 起動時はまず端末内保存から即時復元する
2. Firebase匿名ログインが完了したらクラウド保存を同期する
3. クラウド側が新しければ端末内へ復元する
4. 端末内側が新しければクラウドへアップロードする
5. 競合がある場合は `updatedAt` が新しい方を優先する
6. 将来の手動マージや履歴復元に備えて、完全削除は慎重に扱う

### 保存対象

- ユーザー設定
  - displayName
  - introSeen
  - cloudEnabled
  - lastSyncedAt
- セッション
  - id
  - title
  - createdAt
  - updatedAt
  - isPinned
- メッセージ
  - id
  - sessionId
  - role
  - content
  - agentId
  - reactions
  - createdAt
  - updatedAt

## Firestore構造案

```txt
users/{uid}
  profile/settings
  sessions/{sessionId}
  sessions/{sessionId}/messages/{messageId}
```

### users/{uid}/profile/settings

```json
{
  "displayName": "あなた",
  "introSeen": true,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp",
  "lastSyncedAt": "serverTimestamp"
}
```

### users/{uid}/sessions/{sessionId}

```json
{
  "title": "言葉にならないもの",
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000,
  "isPinned": false,
  "deletedAt": null
}
```

### users/{uid}/sessions/{sessionId}/messages/{messageId}

```json
{
  "role": "user",
  "content": "今日考えたこと...",
  "agentId": null,
  "reactions": null,
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000,
  "deletedAt": null
}
```

## Firebase匿名ログイン方針

- `signInAnonymously` を使う
- メールアドレスやパスワードは初期版では扱わない
- UIDごとにFirestore保存領域を分ける
- 匿名ユーザーは同じ端末・同じアプリ環境では維持される想定
- アプリ削除やブラウザデータ削除で匿名UIDが失われる可能性がある

## localStorage / IndexedDB / Firestore の役割

| 保存先 | 役割 |
|---|---|
| localStorage | 起動直後の軽い復元 |
| IndexedDB | 端末内のやや強い保存 |
| Firestore | クラウド保存・別端末復元 |

クラウド保存後も、端末内保存は消さない。通信失敗時やオフライン時の安全網として残す。

## 同期タイミング案

### 起動時

1. localStorage / IndexedDB から即時復元
2. Firebase匿名ログイン
3. Firestoreからクラウド状態を取得
4. `updatedAt` / `savedAt` を比較
5. 新しい方を採用

### 操作時

- セッション作成
- メッセージ追加
- メッセージ削除
- セッション削除
- ピン留め
- タイトル編集
- 名前変更

これらの操作後に端末内保存し、クラウド保存はdebounceして送る。

## セキュリティ方針

- ユーザーは自分の `users/{uid}` 以下だけ読める
- ユーザーは自分の `users/{uid}` 以下だけ書ける
- 他人のデータは読めない
- admin権限や全体読み取りは使わない
- Firestore rulesを入れるまで本番扱いにしない

## 手動ゲート

以下は必ず手動確認する。

- Firebase project作成
- Firebase Authenticationで匿名ログインを有効化
- Firestore Database作成
- Firestore rules設定
- Vercel Environment Variables登録
- 本番URLで動作確認
- プライバシーポリシー更新
- App Store提出判断

## 環境変数案

Firebase client config は公開される前提の値ですが、環境ごとに管理するためVercel envに置く。

```txt
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

注意: サーバーsecretやAdmin SDKキーはブラウザ側へ置かない。

## Phase 2Bでやること

- firebase package追加
- `src/services/cloud/firebaseClient.ts` 追加
- `src/services/cloud/cloudStorage.ts` 追加
- cloud未設定時は端末内保存のみで動作
- cloud設定済み時だけ匿名ログインとFirestore同期を開始
- Debug/Settingsに保存状態を表示

## Phase 2Cでやること

- 手動でFirebase project作成
- Vercel env登録
- Firestore rules設定
- Previewで読み書き確認
- 問題なければmainへ反映

## 初期版でまだやらないこと

- Googleログイン
- メールログイン
- 複数端末の高度な競合マージ
- 完全なバックアップ/復元UI
- 課金
- Gemini API実接続

## App Store向け注意

ユーザーの内省データをクラウド保存する場合、App Store提出前に以下を整える。

- プライバシーポリシー
- データ削除方法
- クラウド保存の説明
- 医療・診断アプリではないことの明記
- 退会/データ削除導線の方針
