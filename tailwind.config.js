/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 既存 slate ベースの抽象名（既存値と完全一致）
        ink: {
          DEFAULT: '#0f172a',   // slate-900 相当（ユーザバブル背景・主要テキスト）
          soft: '#334155',       // slate-700
          muted: '#64748b',      // slate-500
          faint: '#94a3b8',      // slate-400
          ghost: '#cbd5e1',      // slate-300
        },
        paper: {
          // lake-bg のグラデ 5 段（既存値と完全一致）
          0: '#f2f6fa',
          1: '#e6ecf3',
          2: '#dce4ee',
          3: '#d3dce8',
          4: '#e0e7f0',
          base: '#eef2f7',       // body 背景（既存）
        },
        // エージェント色（既存 data/agents.ts と一致）
        agent: {
          soul:       { 50: '#f5f3ff', 100: '#ede9fe', 700: '#6d28d9' }, // violet
          creative:   { 50: '#fff7ed', 100: '#ffedd5', 600: '#ea580c' }, // orange
          strategist: { 50: '#eff6ff', 100: '#dbeafe', 700: '#1d4ed8' }, // blue
          empath:     { 50: '#fff1f2', 100: '#ffe4e6', 700: '#be123c' }, // rose
          critic:     { 50: '#f1f5f9', 100: '#e2e8f0', 700: '#334155' }, // slate
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Hiragino Sans"',
          '"Yu Gothic UI"',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        sheet: '2rem',     // モーダル外殻
        card: '1.5rem',    // メッセージバブル等
        pill: '9999px',
      },
      boxShadow: {
        // 既存 neu-convex-sm 相当を semantic 化
        breath:
          '2px 2px 6px rgba(174, 188, 206, 0.2), -2px -2px 6px rgba(255, 255, 255, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        // 既存 glass-card 相当
        lift:
          '3px 3px 10px rgba(174, 188, 206, 0.2), -3px -3px 10px rgba(255, 255, 255, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        // 既存 neu-pressed 相当
        pressed:
          'inset 2px 2px 6px rgba(163, 177, 198, 0.35), inset -2px -2px 6px rgba(255, 255, 255, 0.5)',
      },
      transitionTimingFunction: {
        quiet: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      transitionDuration: {
        breath: '180ms',
        settle: '320ms',
      },
      maxWidth: {
        prose_ja: '64ch',
      },
    },
  },
  plugins: [],
};
