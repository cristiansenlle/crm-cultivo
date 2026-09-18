import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ['192.168.0.113'],
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
