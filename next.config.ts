import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "shopify-dev-tunnel.xubitar.com",
    "triclinic-measurelessly-bryanna.ngrok-free.dev",
  ],
};

export default nextConfig;
