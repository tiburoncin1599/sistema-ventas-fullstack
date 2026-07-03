import type { NextConfig } from 'next';

const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app';

const API_HOST = rawUrl.startsWith('http')
  ? new URL(rawUrl).hostname
  : rawUrl;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: API_HOST,
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: API_HOST,
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;