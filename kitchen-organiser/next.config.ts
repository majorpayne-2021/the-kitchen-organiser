import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
  ],
  typescript: {
    // TypeScript type checking is run separately; skip during build to avoid timeout
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
