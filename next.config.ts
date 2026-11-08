import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve the project-owned AGENTS.md instead of appending generated rules.
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // TODO: Restrict hosts when the product image provider is selected.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
