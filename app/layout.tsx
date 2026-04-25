import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://paleozooa.dev"
  ),
  title: {
    default: "Paleozooa - Daily Dinosaur Guessing Game",
    template: "%s | Paleozooa",
  },
  description: "Guess the mystery dinosaur each day using taxonomy clues. A Wordle-style game for Mesozoic animals — learn paleontology while you play.",
  keywords: ["dinosaur", "guessing game", "paleontology", "taxonomy", "wordle", "mesozoic", "evolution"],
  openGraph: {
    title: "Paleozooa - Daily Dinosaur Guessing Game",
    description: "Guess the mystery dinosaur each day using taxonomy clues.",
    type: "website",
    siteName: "Paleozooa",
  },
  twitter: {
    // "summary" produces the compact embed (small square thumbnail on the
    // right), matching the Metazooa share style. Discord, Reddit, and
    // iMessage all follow this hint. Use "summary_large_image" if you want
    // the wide banner-card layout instead — it requires a 1200x630 image.
    card: "summary",
    title: "Paleozooa",
    description: "Guess the mystery dinosaur each day using taxonomy clues.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
