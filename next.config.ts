import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/model-proxy/:path*",
        destination: "http://43.135.154.69:8080/:path*",
      },
    ];
  },
};

export default nextConfig;
