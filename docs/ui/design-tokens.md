# Design Tokens — じぶん会議 はじめの版

このドキュメントは、Phase H-1 で導入した Design Token の意図と使い分けを定義します。
値はすべて既存 UI と一致する ものを別名化しただけで、見た目を変えるものではありません。

## なぜトークン化するか

`src/AppStable.tsx` には現在、色・余白・影・トランジションが直接書かれています。
Phase H-2 以降でコンポーネントを切り出すとき、複数箇所で同じ値を使い回すために、
意味のある名前を先に与えておきます。

## カラー

### Surface（背景・面）

| トークン | 値 | 用途 |
|---|---|---|
| paper.base | #eef2f7 | 全体背景の基本色（body 背景） |
| paper.0 〜 paper.4 | #f2f6fa 〜 #e0e7f0 | lake-bg のグラデ 5 段 |

### Ink（テキスト・暗い面）

| トークン | 値 | 用途 |
|---|---|---|
| ink.DEFAULT | #0f172a | 主要テキスト・ユーザバブル背景 |
| ink.soft | #334155 | 標準テキスト |
| ink.muted | #64748b | 弱いテキスト |
| ink.faint | #94a3b8 | メタ情報 |
| ink.ghost | #cbd5e1 | プレースホルダ・disabled |

### Agent（5 つの視点）

| トークン | 既存ファイル | 用途 |
|---|---|---|
| agent.soul.* | data/agents.ts の soul | レイ |
| agent.creative.* | data/agents.ts の creative | ジョー |
| agent.strategist.* | data/agents.ts の strategist | ケン |
| agent.empath.* | data/agents.ts の empath | ミナ |
| agent.critic.* | data/agents.ts の critic | サトウ |

`data/agents.ts` の値が正本です。ここで定義したトークンは「Tailwind 経由で参照したい時の別名」です。

## タイポグラフィ

`fontFamily.sans` を和文優先のシステムスタックに固定しました。
本格的なタイポグラフィ調整は Phase H-3 で行います。

## 角丸

| トークン | 値 | 用途 |
|---|---|---|
| rounded-sheet | 2rem | モーダル外殻 |
| rounded-card | 1.5rem | メッセージバブル・主要カード |
| rounded-pill | 9999px | バッジ・ピル |

## 影

既存 `neu-convex-sm` / `glass-card` / `neu-pressed` と **完全に同じ値** に semantic 名を付けたもの。

| トークン | 既存クラス | 用途 |
|---|---|---|
| shadow-breath | neu-convex-sm | 浮いた小カード |
| shadow-lift | glass-card | 主要カード（モーダル等） |
| shadow-pressed | neu-pressed | 沈んだ要素（選択中サイドバー等） |

## モーション

| トークン | 値 | 用途 |
|---|---|---|
| ease-quiet | cubic-bezier(0.2, 0.8, 0.2, 1) | 標準イージング |
| duration-breath | 180ms | 短い反応（ボタン押下等） |
| duration-settle | 320ms | 落ち着く遷移（モーダル開閉等） |

## 既存クラスとの関係

このフェーズでは、既存クラス（`lake-bg` / `water-shimmer` / `neu-convex-sm` / `neu-concave` / `neu-pressed` / `glass-card` / `mirror-reflection` / `no-scrollbar`）は **書き換えません**。
従って、`AppStable.tsx` 上の見た目はこのフェーズで変化しません。

Phase H-2 以降でコンポーネントを切り出す際、既存クラスをそのまま使ってよく、新規部分のみ
このトークンを参照する形で進めます。

## 触ってはいけない値

`data/agents.ts` の各エージェントの `color` / `accentColor` / `borderColor` は、
JSX でそのまま使われている既存色クラス名（例: `bg-violet-50`）です。
Tailwind の `agent.soul.*` トークンを追加した後も、`data/agents.ts` 側は **変更しません**。
これは Phase 全体を通じての rule です。
