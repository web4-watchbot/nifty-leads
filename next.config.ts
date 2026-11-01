import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` is for self-hosting. On Vercel the platform builds and serves
  // the app itself, so keep the default output there.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
