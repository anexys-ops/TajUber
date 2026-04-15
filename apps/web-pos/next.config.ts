import path from "node:path";
import type { NextConfig } from "next";

const posBasePath = process.env.NEXT_PUBLIC_POS_BASE_PATH?.trim() || "";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  ...(posBasePath ? { basePath: posBasePath } : {}),
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
