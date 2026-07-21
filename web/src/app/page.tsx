import React from "react";
import type { Metadata } from "next";
import HomeView from "@/components/home/HomeView";

/**
 * `/` — public home (pages.md Part A, Brex-editorial; W2).
 */

export const metadata: Metadata = {
  title: "Expendit — See every naira. File every tax.",
  description:
    "Open-source financial intelligence for Nigerian freelancers, SMEs and companies: upload statements or link your bank, AI categorizes and flags what's off, then see your P&L, ratios and filing-ready taxes. MIT licensed — self-host with one command.",
  openGraph: {
    title: "Expendit — See every naira. File every tax.",
    description:
      "Upload statements or link your bank — AI categorizes every transaction and flags what's off. Then see your P&L, your ratios, and exactly which tax to pay — and where to remit it.",
    url: "https://expendit.cuesoft.io",
    siteName: "Expendit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Expendit — See every naira. File every tax.",
    description:
      "Open-source financial intelligence: statements → categorized ledger → ratios → filing-ready taxes. Free forever if you self-host.",
  },
};

export default function Home() {
  return <HomeView />;
}
