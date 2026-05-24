import type { Metadata } from "next";
import LandingContent from "@/components/LandingContent";

export const metadata: Metadata = {
  title: "Prowider — Lead Distribution System",
};

export default function HomePage() {
  return <LandingContent />;
}
