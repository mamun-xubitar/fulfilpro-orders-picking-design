import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
     new URL(process.env.APP_URL || "shopify-dev-tunnel.xubitar.com").hostname,
  ],
};

export default nextConfig;
