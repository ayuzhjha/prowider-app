import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Provider Dashboard",
  description: "Real-time provider dashboard showing lead assignments and quota status",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
