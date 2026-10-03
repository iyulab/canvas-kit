import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  // GitHub Pages를 위한 설정
  output: isGitHubPages ? 'export' : undefined,
  basePath: isGitHubPages ? '/canvas-kit' : '',
  assetPrefix: isGitHubPages ? '/canvas-kit/' : '',
  trailingSlash: isGitHubPages,
  images: isGitHubPages ? { unoptimized: true } : undefined,

  transpilePackages: ['@canvas-kit/core', '@canvas-kit/viewer', '@canvas-kit/designer'],
  turbopack: {},
};

export default nextConfig;