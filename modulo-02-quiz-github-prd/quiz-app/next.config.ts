import type { NextConfig } from "next";

// cacheComponents fica desligado: ver "Decisões técnicas" no README.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
