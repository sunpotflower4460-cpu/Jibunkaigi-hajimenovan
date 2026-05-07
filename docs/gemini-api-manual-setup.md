# Gemini API Manual Setup

## 目的

じぶん会議 はじめの版で、ブラウザ側にAPIキーを置かずにGemini APIを呼び出す。

## 方針

- APIキーはコードに書かない
- APIキーはチャットにも貼らない
- `VITE_` を付けない
- サーバー側の環境変数 `GEMINI_API_KEY` として登録する
- フロントは `/api/gemini` だけを呼ぶ

## Vercelでの手動設定

ここは手動です。

1. Vercelを開く
2. 対象Projectを開く
3. Settings を開く
4. Environment Variables を開く
5. `GEMINI_API_KEY` を追加
6. 値にGemini APIキーを入れる
7. Production / Preview / Development の必要な環境を選ぶ
8. Saveする
9. Redeployする

任意で以下も設定できます。

```txt
GEMINI_MODEL=gemini-2.5-flash
```

## 注意

`VITE_GEMINI_API_KEY` は作らない。

`VITE_` が付く環境変数はブラウザ側へ露出する前提なので、Gemini APIキーには使わない。

## 未設定時の挙動

`GEMINI_API_KEY` が未設定の場合、`/api/gemini` は以下のエラーを返す。

```json
{
  "ok": false,
  "code": "GEMINI_API_KEY_MISSING"
}
```

この状態でもアプリ本体は壊れないようにする。

## 今回のPhase範囲

Phase 3Aでは、APIの受け皿だけを作る。

5人のエージェント応答・心の鏡・OTHERSへの実接続は、次のPhaseで行う。
