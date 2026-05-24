import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request a Service",
  description: "Submit a service enquiry and get connected with the best providers in your area",
};

export default function RequestServiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
