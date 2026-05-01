# Internal Mirror Map

## 目的

内部マップは、じぶん会議が会話の流れを裏側で静かに整理し、各エージェントが自然に「鏡の角度」を持てるようにするための土台である。

これはユーザーへそのまま読み上げる説明資料ではない。

## 基本原則

```txt
会話入力
→ 内部マップ更新
→ エージェントごとの焦点へ変換
→ 必要な結果だけ薄く渡す
→ 自然な返答として表に出る
```

内部マップそのものを読み上げると、じぶん会議は「内面の図解アプリ」になってしまう。
はじめの版では、あくまで返答の奥ににじむ程度に扱う。

## マップの主要ノード

- passion: まだ消えてない情熱
- feeling: 言葉の奥にある気持ち
- direction: 本当は向かいたい方向
- contradiction: 矛盾している部分
- avoidance: 逃げている部分
- theme: くり返すテーマ
- grounding: 現実へ戻る足場

## エージェントへの渡し方

### ジョー

- focus: まだ消えてない情熱
- kind: passion
- 返答では、火種や創造衝動としてにじませる

### ミナ

- focus: 言葉の奥にある気持ち
- kind: feeling
- 返答では、急がされていた感情を守る形でにじませる

### レイ

- focus: 本当は向かいたい方向
- kind: direction
- 返答では、断定ではなく向きや気配としてにじませる

### ケン

- focus: 矛盾している部分
- kind: contradiction
- 返答では、もつれや前提のズレとしてにじませる

### サトウ

- focus: 逃げている部分
- kind: avoidance
- 返答では、責めるのではなく足場を守る現実感覚としてにじませる

### 心の鏡

- focus: 複数の声の配置
- kind: theme
- 返答では、総意ではなく未統合の声の配置としてにじませる

## 現在の実装

- `src/types.ts`
  - `MirrorMapNodeKind`
  - `MirrorMapNode`
  - `MirrorAgentHint`
  - `InternalMirrorMap`
- `src/services/internalMirrorMap.ts`
  - 直近メッセージから軽量にノードを抽出
  - エージェントごとの `agentHints` を作成
  - `getAgentMirrorHintText` で返答生成へ薄く渡せる
- `src/services/ai.ts`
  - モック応答の seed に内部ヒントを薄く反映
  - 内部マップ文そのものは読み上げない

## 今後

- Gemini API接続時は、内部マップを system prompt に全文で読ませすぎない
- agentHints のうち、必要な焦点だけを短く渡す
- UI表示する場合は開発モードから始める
- 本番では「マップそのもの」より、言葉の水面・輪郭・会議録として間接表示する
