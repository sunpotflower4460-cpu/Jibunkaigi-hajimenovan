# Phase 3B: Gemini Response Connection

## 目的

5人のエージェント応答・心の鏡・OTHERSを、Phase 3Aで追加した `/api/gemini` 経由のGemini APIへ接続する。

## 方針

- APIキーはブラウザ側に置かない
- フロントは `src/services/geminiApiClient.ts` から `/api/gemini` を呼ぶ
- Geminiが未設定・失敗・空応答の場合は既存のローカル応答へ戻す
- UI側の大改造はしない
- 生成中で固まらない既存の安全処理は維持する

## 変更内容

- `src/services/ai.ts`
  - 既存の `generateMockReply` をGemini優先に変更
  - 失敗時はローカルfallback応答へ戻す
  - 心の鏡もGemini優先に変更
  - OTHERSもGemini JSON生成を試みる
  - OTHERSのJSON解析に失敗した場合は既存の `buildOthersReactions` に戻す

## 手動確認

- `GEMINI_API_KEY` 未設定でもアプリが壊れない
- 未設定時はローカル応答が返る
- `GEMINI_API_KEY` 設定後にGemini応答が返る
- レイ/ジョー/ケン/ミナ/サトウが返答する
- 心の鏡が返答する
- OTHERSが自分以外の4人で出る
- Gemini通信失敗時に生成中のまま固まらない

## 次の改善候補

- OTHERSに会話文脈をより深く渡す
- 設定画面にAI接続状態の簡易テストを追加する
- Gemini接続時/ローカルfallback時をDebug表示できるようにする
