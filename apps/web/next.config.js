/** @type {import('next').NextConfig} */
const nextConfig = {
  // `standalone` is for self-hosting (Docker). On Vercel the platform builds
  // and serves the app itself, so output must stay in the default mode.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  reactStrictMode: true,
  transpilePackages: ["@nifty-leads/core"],
};

module.exports = nextConfig;
