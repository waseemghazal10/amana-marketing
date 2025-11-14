import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopack: {
      resolveAlias: {
        'leaflet': 'leaflet/dist/leaflet.js',
      },
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'leaflet': 'leaflet/dist/leaflet.js',
    };
    return config;
  },
};

export default nextConfig;
