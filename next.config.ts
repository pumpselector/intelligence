import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF to browsers that support it (smaller than WebP), fall back to
    // WebP otherwise. Applies to every next/image-optimized asset.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
