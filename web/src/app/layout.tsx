import React from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider, themeInitScript } from "@/design/ThemeProvider";
import "./globals.css";

// Design-system type (design.md §2): Inter for UI/display (Inter Display
// lands at the brand pass), JetBrains Mono for account numbers/statement
// IDs/code. Exposed as CSS variables consumed by Tailwind font-sans/mono.
// The legacy provider stack (Session/Home/Nav), slick-carousel CSS, and
// the legacy Google-fonts links retired with the W3 quarantine tranche —
// the quarantined trees under src/legacy/ keep their own copies.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata = {
  title: "Expendit",
  description: "Expense tracker App",
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
