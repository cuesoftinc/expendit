import type { Config } from "tailwindcss";

/**
 * Tailwind maps to the token CSS variables in src/design/tokens.css
 * (docs/design.md §2) — components style through these utilities, never
 * raw hex. Legacy color names (secondary/purpleTheme/grayTheme) remain
 * only for the pre-redesign pages still live outside src/legacy/.
 */
const config: Config = {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        "bg-editorial": "var(--color-bg-editorial)",
        "bg-elev": "var(--color-bg-elev)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        "text-2": "var(--color-text-2)",
        accent: "var(--color-accent)",
        "on-accent": "var(--color-on-accent)",
        income: "var(--color-income)",
        expense: "var(--color-expense)",
        warn: "var(--color-warn)",
        info: "var(--color-info)",
        // Legacy palette (MUI-era pages; retired with them at W3).
        secondary: "#121212",
        purpleTheme: "#A259FF",
        grayTheme: "#F7F7F7",
      },
      borderRadius: {
        DEFAULT: "var(--radius)", // product radii: 6px
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "300ms",
        entrance: "250ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },
      zIndex: {
        base: "0",
        sticky: "10",
        dropdown: "20",
        overlay: "30",
        modal: "40",
        toast: "50",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: [
          "var(--font-jetbrains-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "monospace",
        ],
      },
    },
    // Shared foundations (design.md §2): Tailwind-aligned breakpoints.
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
  },
  plugins: [],
};
export default config;
