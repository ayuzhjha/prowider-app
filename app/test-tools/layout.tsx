import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test Tools",
  description: "Testing panel for webhook simulation, idempotency testing, and concurrent lead generation",
};

export default function TestToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
