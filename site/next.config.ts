import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@canvas-kit/core', '@canvas-kit/viewer', '@canvas-kit/designer'],
  webpack: (config: any) => {
    // Node.js 모듈을 브라우저에서 제외
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'canvas': false,
      'fs': false,
    };

    return config;
  },
};

export default nextConfig;