import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        secondary: "#121212",
        purpleTheme: "#A259FF",
        grayTheme: "#F7F7F7"
      }
    },
    screens: {
      'lg': '912px',
      'sm': '640px',
      'md': '768px',
    }
  },
  plugins: [],
}
export default config
