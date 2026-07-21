import React from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider, themeInitScript } from "@/design/ThemeProvider";
import SkipLink from "@/components/ui/SkipLink";
import "./globals.css";

// Design-system type (design.md §2): Inter for UI/display (Inter Display
// lands at the brand pass), JetBrains Mono for account numbers/statement
// IDs/code. Exposed as CSS variables consumed by Tailwind font-sans/mono.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata = {
  // Absolute base for og/twitter images, canonicals and other metadata
  // URLs (SEO plumbing, fleet canon).
  metadataBase: new URL("https://expendit.cuesoft.io"),
  title: "Expendit",
  description: "Expense tracker App",
  // Every route's canonical is its own path, resolved against metadataBase.
  alternates: { canonical: "./" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Pre-paint theme bootstrap: applies the persisted data-theme
            override before first paint (ThemeProvider contract — a fully
            static string, no runtime code construction). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        {/* First focusable on every route (fleet canon P15) — every
            page's <main> carries id="main" + tabIndex={-1}. */}
        <SkipLink />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
