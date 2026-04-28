# Firebaseクラウド保存 手動セットアップ

Phase 2Bのコードは、Firebase設定がない場合は端末内保存だけで動きます。
クラウド保存を有効にするには、以下を手動で行います。

## 1. Firebase projectを作成

1. Firebase Consoleを開く
2. 新しいプロジェクトを作成
3. Webアプリを追加
4. Firebase configを確認

## 2. Authenticationを有効化

1. Firebase Console > Authentication
2. Sign-in method
3. Anonymous を有効化

## 3. Firestore Databaseを作成

1. Firebase Console > Firestore Database
2. Databaseを作成
3. Production modeを選ぶ
4. locationを選ぶ

## 4. Firestore rules案

初期案です。公開前に必ずFirebase Consoleで確認してください。

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 5. Vercel Environment Variablesを登録

Vercel Project > Settings > Environment Variables に以下を登録します。

```txt
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

値はFirebase Web App configからコピーします。

注意: Firebase Admin SDKキーやservice account jsonは絶対に入れないでください。

## 6. Redeploy

環境変数を登録したら、VercelでRedeployします。

## 7. 動作確認

- 画面右下が「端末内保存」から「クラウド準備中」「クラウド保存済み」へ変わるか
- 会話を作ってリロードして残るか
- Firestoreに `users/{uid}/snapshots/app-state` が作成されるか
- 別ブラウザでは匿名UIDが違うため同じ履歴にならない可能性がある

## 8. App Store前に必要なこと

- プライバシーポリシーにクラウド保存を明記
- データ削除方法を決める
- 匿名ログインの限界を説明する
- 必要なら設定画面に「クラウド保存状態」を表示する
- 将来的にはアカウント連携やデータ削除ボタンを検討する
