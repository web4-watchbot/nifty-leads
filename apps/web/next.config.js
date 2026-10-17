/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@nifty-leads/core"],
};

module.exports = nextConfig;
