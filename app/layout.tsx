import type { Metadata } from "next";
import { Providers } from "@/components/web3/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VURAFY // Track Tokenization Protocol",
  description:
    "Launch a track. Trade the curve. VURAFY tokenizes music on Robinhood Chain — vura.ink",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "64x64" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0a] text-white font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
