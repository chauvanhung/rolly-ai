import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiDest = process.env.BACKEND_URL || "http://backend:8000/api/v1/:path*";
    // When BACKEND_URL is full rewrite pattern, derive uploads host
    const uploadDest =
      process.env.BACKEND_UPLOADS_URL ||
      (apiDest.includes("/api/v1")
        ? apiDest.replace("/api/v1/:path*", "/api/uploads/:path*")
        : "http://backend:8000/api/uploads/:path*");
    return [
      {
        source: "/api/v1/:path*",
        destination: apiDest,
      },
      // Audio/PDF/images stored by backend StaticFiles
      {
        source: "/api/uploads/:path*",
        destination: uploadDest,
      },
    ];
  },
};

export default nextConfig;
