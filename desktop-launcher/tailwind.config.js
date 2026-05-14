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
          500: '#3b82f6', // Replace with actual LazPlay brand color
          600: '#2563eb',
        }
      }
    },
  },
  plugins: [],
}
