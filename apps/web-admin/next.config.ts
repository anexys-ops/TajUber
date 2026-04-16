import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const versionPath = path.join(__dirname, "../../version.txt");
function readAppVersion(): string {
  try {
    const raw = fs.readFileSync(versionPath, "utf8").trim();
    return raw || "dev";
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  env: {
    NEXT_PUBLIC_APP_VERSION:
      process.env.NEXT_PUBLIC_APP_VERSION?.trim() || readAppVersion(),
  },
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
