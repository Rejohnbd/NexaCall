import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["103.113.13.2", "localhost"],
  /* config options here */
  webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    return config;
  },
};

export default nextConfig;