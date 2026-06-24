/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Page & Surfaces
        page:        '#F7F5F0',
        surface:     '#FFFFFF',
        'surface-sub':'#F0EDE8',
        border:      '#E2DDD6',
        'border-hover':'#C8C3BB',

        // Text
        'text-primary':   '#1A1814',
        'text-secondary': '#6B6560',
        'text-tertiary':  '#9E9992',

        // Accent
        accent:     '#4F6EF7',
        'accent-bg':'#EEF1FE',

        // Citation teal
        teal:       '#1A8A6B',
        'teal-bg':  '#E8F5F1',

        // PDF red
        'pdf-red':  '#E03B2F',

        // Semantic
        success:    '#1A7A4A',
        warning:    '#C47A1A',
        'warning-bg':'#FEF3E2',
        danger:     '#C0392B',

      },

      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },

      fontSize: {
        'xs':   ['11px', { lineHeight: '1.4' }],
        'sm':   ['13px', { lineHeight: '1.5' }],
        'base': ['15px', { lineHeight: '1.7' }],
        'lg':   ['18px', { lineHeight: '1.5' }],
        'xl':   ['24px', { lineHeight: '1.3' }],
        '2xl':  ['32px', { lineHeight: '1.2' }],
        'hero': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },

      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
      },

      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },

      width: {
        'sources':   '256px',
        'citations': '300px',
      },
    },
  },
  plugins: [],
}
