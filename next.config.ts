import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mongoose must not be bundled by webpack — treat as external in serverless
  serverExternalPackages: ["mongoose"],
  // Disable static optimization for pages that use real-time data
  reactStrictMode: true,
};

export default nextConfig;
