import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Allow next/image to optimize signed Supabase Storage URLs (photo
    // thumbnails/previews). Exact live host, restricted to signed object
    // paths - without this, next/image rejects every remote URL with
    // 400 INVALID_IMAGE_OPTIMIZE_REQUEST.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ivcwzvjdnaoecrsqwrhq.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
