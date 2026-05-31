import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@g14o/utils",
    "@g14o/cache",
    "@g14o/ratelimit",
  ],
};

export default nextConfig;
