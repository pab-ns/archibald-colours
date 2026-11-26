/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html","./js/**/*.js"],
    safelist:[
    // coaching
    'xxxs',
    'xxs',
    'vanGogh'
  ],

  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '1020px',
      xl: '1440px',
    },
    extend: {
      colors: {
        vanGogh: '#232638',
      },
      fontFamily: {
        aboreto: ['Aboreto'],
        boldonse: ['Boldonse']
      },
      fontSize:{
        xxxs: '0.5rem',
        xxs: '0.625rem',
        md: '0.938rem'
      }

    },
  },
  plugins: [],
}

