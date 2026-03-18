import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["canvas"],
  turbopack: {
    resolveAlias: {
      canvas: "./src/empty.ts",
    },
  },
};

export default nextConfig;
