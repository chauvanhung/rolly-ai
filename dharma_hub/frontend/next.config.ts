import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const dest = process.env.BACKEND_URL || "http://localhost:8015/api/v1/:path*";
    return [
      {
        source: "/api/v1/:path*",
        destination: dest,
      },
    ];
  },
};

export default nextConfig;
