import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve the project-owned AGENTS.md instead of appending generated rules.
  agentRules: false,
  images: {
    // Uploaded images use local /api/images paths.
    remotePatterns: [],
  },
};

export default nextConfig;
