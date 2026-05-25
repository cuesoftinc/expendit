/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        secondary: "#121212",
        grayTheme: "#F7F7F7",
        purpleTheme: "#A259FF",
      }
    },
    screens: {
      'xl': '1280px',
      'lg': '912px',
      'sm': '640px',
      'md': '768px',
    }
  },
  plugins: [],
}
