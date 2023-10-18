import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    theme: {
      extend: {
        colors: {
          secondary: "#121212",
          input: "#EDEEF9"
        }
      },
    },
  },
  plugins: [],
}
export default config
