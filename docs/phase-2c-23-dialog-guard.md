# Phase 2C-23: Dialog Guard

## 目的

実機QAで起こりやすい、モーダル/パネル表示中の背景スクロールや右下UIの干渉を減らす。

## 修正内容

- `DiveDialogGuard` を追加
  - `role="dialog"` かつ `aria-modal="true"` の要素を監視
  - dialogが開いている間、bodyスクロールを固定
  - `data-dive-dialog-open` を html/body に付与
- `main.tsx` に `DiveDialogGuard` を常駐
- `dive-tools-accessibility.css` を更新
  - dialog表示中は `DiveToolsDock` を非表示
  - overscroll-behavior を抑制

## 期待される効果

- パネル表示中に背景が勝手にスクロールしにくくなる
- モーダル上で右下の「潜る」ボタンが邪魔をしにくくなる
- スマホ実機でのパネル操作が少し安定する

## 手動確認

- 潜る → 設定 を開いた時、背景がスクロールしにくい
- 設定パネル表示中に右下の潜るボタンが消える
- 設定を閉じると潜るボタンが戻る
- 会議録 / 言葉 / 付箋 / 輪郭でも同じ挙動になる
