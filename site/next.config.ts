import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@canvas-kit/core', '@canvas-kit/viewer', '@canvas-kit/designer'],
};

export default nextConfig;