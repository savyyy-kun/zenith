import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Zenith · daily flight",
  description: "Seven prompts a day. Rarer answers fly you higher, from the launch pad to the Moon.",
};
export const viewport: Viewport = { themeColor: "#0b0f14", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
