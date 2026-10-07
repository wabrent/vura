import type { Metadata } from "next";
import { ScannerApp } from "@/components/rugscan/ScannerApp";

export const metadata: Metadata = {
  title: "VURA // Rug Scanner",
  description:
    "Scan any wallet's ERC20 portfolio and get a brutal Degradation Score. Honeypots, dust, exit liquidity — we quantify your disgrace.",
};

export default function ScannerPage() {
  return <ScannerApp />;
}
