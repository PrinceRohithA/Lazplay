/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./renderer/index.html",
    "./renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: 'var(--primary, #00f6f6)',
          600: 'var(--primary-fixed-dim, #00dddd)',
          400: 'var(--primary-fixed, #00fbfb)',
        },
        slate: {
          950: '#0e0e0e',
          900: '#131313',
          800: '#201f1f',
          700: '#2a2a2a',
          600: '#353534',
          500: '#717171',
          400: '#a0a0a0',
          300: '#d1d1d1',
          200: '#e5e2e1',
          100: '#f0f4ef',
          50: '#ffffff',
        }
      }
    },
  },
  plugins: [],
}
