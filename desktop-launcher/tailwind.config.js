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
          500: 'var(--brand-500, #39ff14)',
          600: 'var(--brand-600, #2ae00f)',
          400: 'var(--brand-400, #6bff4d)',
        }
      }
    },
  },
  plugins: [],
}
