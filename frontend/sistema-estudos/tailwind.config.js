/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
      backgroundImage: {
        'gradient-rainbow': 'linear-gradient(to right, #6EE7B7, #3B82F6, #9333EA)',
      },
      fontFamily: {
        sans: ['Poppins', 'Montserrat', 'Inter', 'sans-serif'],
      },
    },
    fontSize: {
      xs: '0.7rem',
      sm: '0.8rem',
      base: '0.92rem',
      lg: '1.05rem',
      xl: '1.15rem',
      '2xl': '1.25rem',
      '3xl': '1.5rem',
      '4xl': '2rem',
      '5xl': '2.5rem',
      '6xl': '3rem',
      '7xl': '4rem',
      '8xl': '5rem',
      '9xl': '6rem',
    },
  },
  plugins: [],
  darkMode: 'class',
}

