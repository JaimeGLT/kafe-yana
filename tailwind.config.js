/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#FAF6F1',
          100: '#F5EBE0',
          200: '#E8D5C4',
          300: '#D4B483',
          400: '#C4883A',
          500: '#8B4513',
          600: '#6B3E0F',
          700: '#4A2C0A',
          800: '#2D1A06',
          900: '#1A0F03',
        },
        cream: {
          light: '#F5E6D3',
          DEFAULT: '#D4A574',
          dark: '#A0522D',
        },
        cafe: {
          primary: '#FFFBF5',
          secondary: '#F5F0E8',
          card: '#FFFFFF',
          sidebar: '#3E2723',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        accent: ['Caveat', 'cursive'],
      },
      boxShadow: {
        'coffee': '0 4px 6px -1px rgba(139, 69, 19, 0.1), 0 2px 4px -1px rgba(139, 69, 19, 0.06)',
        'coffee-lg': '0 10px 15px -3px rgba(139, 69, 19, 0.1), 0 4px 6px -2px rgba(139, 69, 19, 0.05)',
      }
    },
  },
  plugins: [],
}