import React from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { HomeProvider, NavProvider, SessionProvider } from "@/context";
import "./globals.css";

// Design-system type (design.md §2): Inter for UI/display (Inter Display
// lands at the brand pass), JetBrains Mono for account numbers/statement
// IDs/code. Exposed as CSS variables consumed by Tailwind font-sans/mono;
// legacy pages keep their own font stack until retired.
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=AR+One+Sans:wght@400;500;600;700&family=Barlow:wght@200;300;400;500;600;700;800;900&family=Cabin:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <SessionProvider>
          <HomeProvider>
            <NavProvider>{children}</NavProvider>
          </HomeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
