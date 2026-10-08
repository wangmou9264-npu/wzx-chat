/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        claude: {
          clay: '#D97757',
          'clay-hover': '#C66545',
          manilla: '#EBDBBC',
          oat: '#E3DACC',
        },
        light: {
          bg100: '#F9F9F7',
          bg200: '#F0EFEC',
          bg300: '#F0EFEC',
          text100: '#131313',
          text300: '#383835',
          text500: '#7B7974',
          border: '#E5E3DE',
        },
        dark: {
          bg100: '#151515',
          bg200: '#0D0D0D',
          bg300: '#0D0D0D',
          text100: '#F9F9F7',
          text300: '#C3C2B7',
          text500: '#97958D',
          border: '#2A2A28',
        },
      },
      borderRadius: {
        'input': '24px',
        'btn': '1000px',
        'card': '16px',
        'item': '10px',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
