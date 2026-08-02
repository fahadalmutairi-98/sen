import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@seen/shared"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "localhost", port: "4000" },
      { protocol: "https", hostname: "**.onrender.com" },
      { protocol: "https", hostname: "**.vercel.app" },
    ],
  },
};

export default nextConfig;
