import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      colors: {
        canvas: '#09090b',
        surface: {
          DEFAULT: '#121215',
          elevated: '#18181b',
          active: '#1c1c21',
          hover: '#141418'
        },
        border: {
          subtle: '#27272a',
          muted: 'rgba(39, 39, 42, 0.5)',
          focus: '#10b981'
        }
      }
    }
  },
  plugins: []
} satisfies Config
