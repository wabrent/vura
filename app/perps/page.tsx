import type { Metadata } from "next";
import { VuraPerps } from "@/components/perps/VuraPerps";

export const metadata: Metadata = {
  title: "VURA // PERPS — Points Season 1",
  description:
    "VURA Perps — perpetual trading in the VURA terminal. Trade volume earns VURA points: +10 pts per $1, x1.5 holder boost, weekly leaderboard.",
};

export default function PerpsPage() {
  return <VuraPerps />;
}
