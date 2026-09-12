
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Palette — Solo Leveling System
        void: {
          DEFAULT: '#0f0e0d',
          light: '#1a1918',
          lighter: '#242322',
        },
        clay: {
          DEFAULT: '#9c6644',
          light: '#b07d5a',
          dark: '#7a4f33',
          muted: 'rgba(156, 102, 68, 0.25)',
        },
        rust: {
          DEFAULT: '#e07a5f',
          light: '#e8957a',
          dark: '#c45f45',
          muted: 'rgba(224, 122, 95, 0.15)',
        },
        olive: {
          DEFAULT: '#81b29a',
          light: '#9bc9b0',
          dark: '#5e8f76',
          muted: 'rgba(129, 178, 154, 0.15)',
        },
        stone: {
          DEFAULT: '#f4f1de',
          light: '#e8e2d9',
          dark: '#c4bdb3',
          muted: 'rgba(244, 241, 222, 0.03)',
        },
        // Semantic aliases
        danger: '#e07a5f',
        success: '#81b29a',
        warning: '#d4a373',
        info: '#9c6644',
        muted: '#666666',
        subtle: '#444444',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.05em' }],
        '3xs': ['0.5625rem', { lineHeight: '0.75rem', letterSpacing: '0.08em' }],
      },
      letterSpacing: {
        'widest': '0.2em',
        'ultra': '0.3em',
      },
      borderRadius: {
        'system': '2px',
      },
      boxShadow: {
        'panel': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'glow-rust': '0 0 20px rgba(224, 122, 95, 0.15)',
        'glow-olive': '0 0 20px rgba(129, 178, 154, 0.15)',
      },
      backgroundImage: {
        'gradient-radial-rust': 'radial-gradient(circle, rgba(224, 122, 95, 0.06) 0%, transparent 70%)',
        'gradient-radial-clay': 'radial-gradient(circle, rgba(156, 102, 68, 0.08) 0%, transparent 70%)',
      },
      animation: {
        'pulse-system': 'pulse-system 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'pulse-system': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
