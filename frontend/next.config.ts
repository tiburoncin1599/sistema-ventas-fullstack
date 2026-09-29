import type { NextConfig } from 'next';

// El backend NestJS corre como proceso hermano (puerto interno) iniciado por
// el launcher raíz. Next enruta las rutas `/api/*`, `/uploads` (a través de
// `/api/uploads/*`), Swagger (`/api-docs`) hacia ese backend del mismo origen.
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api-docs', destination: `${INTERNAL_API_URL}/api` },
      { source: '/api-docs-json', destination: `${INTERNAL_API_URL}/api-json` },
      { source: '/api/:path*', destination: `${INTERNAL_API_URL}/:path*` },
    ];
  },
};

export default nextConfig;