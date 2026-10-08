import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/web3/Providers";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jb",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vura.ink"),
  title: "VURAFY // Track Tokenization Protocol",
  description:
    "Launch a track. Trade the curve. VURAFY tokenizes music on Robinhood Chain — vura.ink",
  openGraph: {
    title: "VURAFY // Track Tokenization Protocol",
    description:
      "Launch a track. Trade the curve. Tokenized music on Robinhood Chain — buy into artists, earn from every listen.",
    url: "https://vura.ink",
    siteName: "VURAFY",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "VURAFY" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "VURAFY // Track Tokenization Protocol",
    description:
      "Launch a track. Trade the curve. Tokenized music on Robinhood Chain.",
    images: ["/og.png"],
  },
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
    <html lang="en" className={`dark ${archivo.variable} ${jbMono.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
