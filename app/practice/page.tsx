import type { Metadata } from "next";
import Game from "@/components/Game";

export const metadata: Metadata = { title: "Zenith · practice" };

export default function Page() {
  return <Game mode="practice" />;
}
