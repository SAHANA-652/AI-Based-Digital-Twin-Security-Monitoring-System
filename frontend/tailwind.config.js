/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        command: {
          canvas: '#0a0d14',
          obsidian: '#0a0d14',
          bg: '#0B0F19',
          surface: '#0E1424',
          card: 'rgba(14, 20, 36, 0.75)',
          border: 'rgba(30, 41, 59, 0.8)',
          highlight: 'rgba(255, 255, 255, 0.05)',
        },
        cyber: {
          cyan: '#00F0FF',
          emerald: '#00FF9D',
          sky: '#38BDF8',
          indigo: '#6366F1',
          violet: '#8B5CF6',
          amber: '#F59E0B',
          rose: '#EF4444',
        },
        neon: {
          cyan: '#00F0FF',
          emerald: '#00FF9D',
          blue: '#00A3FF',
        },
        background: '#0B0F19',
        surface: '#0E1424',
        'surface-card': 'rgba(14, 20, 36, 0.75)',
        'surface-subtle': '#131B2E',
        'surface-border': 'rgba(30, 41, 59, 0.8)',
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        risk: {
          info: '#0284C7',
          low: '#10B981',
          elevated: '#F59E0B',
          high: '#F97316',
          critical: '#EF4444',
        }
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 12px 30px -4px rgba(0, 0, 0, 0.6), 0 0 15px -3px rgba(0, 240, 255, 0.15)',
        'glow-cyan': '0 0 25px -5px rgba(0, 240, 255, 0.35)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.35)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.35)',
        'glow-rose': '0 0 25px -5px rgba(239, 68, 68, 0.35)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
      }
    },
  },
  plugins: [],
}
