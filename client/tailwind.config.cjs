/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'base-bg': '#f5f5f5',
        'base-panel': '#ffffff',
        'base-border': '#e5e5e5',
        'base-text': '#333333',
        'base-muted': '#999999',
        'base-accent': '#1a1a1a',
        'base-hover': '#f0f0f0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
