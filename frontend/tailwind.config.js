/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          900: '#0c0e12',
          800: '#15181e',
          700: '#1e222b',
          600: '#2b313d'
        },
        engine: {
          orange: '#ff5e1e',
          cyan: '#00d2ff',
          steel: '#8a99a8',
          gold: '#f59e0b'
        }
      }
    },
  },
  plugins: [],
}
