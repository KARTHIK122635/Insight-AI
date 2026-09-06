/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fafafa',
          100: '#f4f4f5',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        darkbg: '#050505',
        darksidebar: '#0a0a0a',
        darkpanel: '#121212',
        darksubpanel: '#1a1a1a',
        darkborder: '#2a2a2a',
        darkborderlight: '#3a3a3a',
        accent: '#06b6d4',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
