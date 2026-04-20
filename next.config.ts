import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-66380422-db98-480f-8bce-2ef241e19910.space.z.ai",
    "*.space.z.ai",
  ],
};

export default nextConfig;
