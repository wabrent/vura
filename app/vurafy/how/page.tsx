import type { Metadata } from "next";
import HowItWorks from "@/components/vurafy/HowItWorks";

export const metadata: Metadata = {
  title: "How it works // VURAFY",
  description:
    "How VURAFY works: launch a track token on pons v2, trade the bonding curve, graduate at 4.2 ETH into the pool. Robinhood Chain.",
};

export default function Page() {
  return <HowItWorks />;
}
