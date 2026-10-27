/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0b1324',
          800: '#1b2a44',
          700: '#293c5e',
          600: '#3b5276',
        },
        accent: {
          DEFAULT: '#95dcff',
          hover: '#b8e9ff',
          light: '#d7f3ff',
        },
        success: '#95dcff',
        error: '#f58a75',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 5px #6366f1, 0 0 10px #6366f1' },
          to: { boxShadow: '0 0 10px #818cf8, 0 0 20px #818cf8, 0 0 40px #6366f1' },
        },
      },
    },
  },
  plugins: [],
}
