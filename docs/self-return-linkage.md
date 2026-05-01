# Self Return Linkage

## 目的

じぶん会議は、AIの応答で終わるアプリではない。

会議録、言葉の水面、自分の輪郭を見たあと、最後にユーザー自身が「私はどう思う？」へ戻れる導線を持つ。

## 基本方針

- AIの結論では終わらない
- 心の鏡や会議録を読んだあと、自分の反応を残せる
- 付箋は「自分に返す問い」の器として使う
- 保存されるのはAIの答えではなく、ユーザー自身の反応

## 現在の実装

- `src/utils/selfReturn.ts`
  - `openSelfReturnNote`
  - `subscribeSelfReturnNote`
  - 外部パネルから付箋パネルを開くイベントを提供
- `StickyNotesPanel`
  - 外部イベントを受けて開く
  - sessionId / kind / seedText を受け取る
- `ConferenceRecordPanel`
  - 会議録カードから「どう思う？」付箋へ戻れる
- `ThemeArchivePanel`
  - 自分の輪郭を見たあと「どう思う？」付箋へ戻れる
- `FloatingKeywordsPanel`
  - 言葉の水面を見たあと「どう思う？」付箋へ戻れる

## 今後

- 個別メッセージ単位で「どう思う？」を貼る
- 付箋を会議録へ反映する
- 付箋の蓄積を「輪郭」側でより強く扱う
- Gemini API接続後も、最後は自分へ戻す設計を維持する
