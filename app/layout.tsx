import type { Metadata } from "next";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";
import { Providers } from "@/components/web3/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VURA // ACCESS TERMINAL",
  description:
    "Vura Genesis Pass — 333 1-bit passes on Robinhood. Intelligence terminal for the VURA ecosystem. vura.ink",
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
        <Providers>
          <LayoutWrapper>{children}</LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
