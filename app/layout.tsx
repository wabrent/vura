import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "VURA | Prediction Terminal",
  description: "Trade prediction markets directly inside VURA. Polymarket CLOB integration.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}