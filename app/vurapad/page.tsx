import type { Metadata } from "next";
import { VuraPadApp } from "@/components/vurapad/VuraPadApp";

export const metadata: Metadata = {
  title: "VURA // VuraPad",
  description:
    "Source research → native token launch on Robinhood Chain. GitHub discovery, pons v2 factory, live market feeds.",
};

export default function VuraPadPage() {
  return <VuraPadApp />;
}
