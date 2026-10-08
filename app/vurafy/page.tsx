import type { Metadata } from "next";
import { VurafyApp } from "@/components/vurafy/VurafyApp";

export const metadata: Metadata = {
  title: "VURAFY // Track Tokenization Protocol",
  description:
    "Tokenized music on Robinhood Chain. Tracks become shares — buy into artists, earn from every listen.",
};

export default function VurafyPage() {
  return <VurafyApp />;
}
