import type { Config } from "tailwindcss";

/**
 * Tailwind maps to the token CSS variables in src/design/tokens.css
 * (docs/design.md §2) — components style through these utilities, never
 * raw hex. Legacy color names (secondary/purpleTheme/grayTheme) remain
 * only for the pre-redesign pages still live outside src/legacy/.
 */
/**
 * Token colors support Tailwind alpha modifiers (bg-info/10, border-warn/40)
 * via color-mix — a plain var() string silently drops the modifier, which
 * left every Figma tint surface transparent. <alpha-value> resolves to 1
 * when no modifier is given, so solid usage is unchanged.
 */
const token = (name: string) =>
  `color-mix(in srgb, var(--color-${name}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        "bg-editorial": token("bg-editorial"),
        "bg-elev": token("bg-elev"),
        border: token("border"),
        text: token("text"),
        "text-2": token("text-2"),
        accent: token("accent"),
        "on-accent": token("on-accent"),
        income: token("income"),
        expense: token("expense"),
        warn: token("warn"),
        info: token("info"),
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
      // MI keyframes (design.md §4) — durations/easings from the token scale.
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        // MI-1: palette opens 120ms fade + 4px rise.
        "rise-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // MI-11: inspector slides in from the right.
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        // BulkActionBar slide-in (design.md §8.2b).
        "slide-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // MI-9: sync dot breathes while syncing.
        breathe: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        // MI-12: chart series draw in 400ms after the axis (pathLength=1).
        "draw-in": {
          from: { strokeDashoffset: "1" },
          to: { strokeDashoffset: "0" },
        },
        // MI-10: filing-success stamp settles in.
        "stamp-in": {
          "0%": { opacity: "0", transform: "scale(1.6) rotate(-8deg)" },
          "60%": { opacity: "1", transform: "scale(0.95) rotate(2deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(0.2, 0, 0, 1) both",
        "rise-in": "rise-in 120ms cubic-bezier(0.2, 0, 0, 1) both",
        "slide-in-right":
          "slide-in-right 280ms cubic-bezier(0.2, 0, 0, 1) both",
        "slide-in-up": "slide-in-up 200ms cubic-bezier(0.2, 0, 0, 1) both",
        breathe: "breathe 2s ease-in-out infinite",
        "draw-in": "draw-in 400ms cubic-bezier(0.2, 0, 0, 1) both",
        "stamp-in": "stamp-in 250ms cubic-bezier(0.2, 0, 0, 1) both",
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
