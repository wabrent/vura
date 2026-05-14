import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "VURA | Prediction Terminal",
  description: "Advanced analytics for Polymarket traders. Whale tracking, arbitrage detection, alpha signals.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}