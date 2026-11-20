import type { NextConfig } from "next";

/**
 * El browser en Vercel es HTTPS; el API en el VPS puede ser HTTP.
 * Proxy same-origin /aurix-api → NEXT_PUBLIC_API_URL evita mixed content.
 */
const apiUpstream = (process.env.NEXT_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    if (!apiUpstream) return [];
    return [
      { source: "/api/catalog/public/:path*", destination: `${apiUpstream}/api/catalog/public/:path*` },
      { source: "/api/media/:path*", destination: `${apiUpstream}/api/media/:path*` },
      {
        source: "/aurix-api/:path*",
        destination: `${apiUpstream}/:path*`,
      },
    ];
  },
};

export default nextConfig;
