/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'btc-orange': '#F7931A',
        'btc-dark': '#0D1117',
        'btc-card': '#161B22',
        'btc-border': '#30363D'
      }
    },
  },
  plugins: [],
}
