/** @type {import('next').NextConfig} */

const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:5000';

// Warn at build time if backend URL is the localhost fallback in a non-local env
if (!process.env.BACKEND_API_URL && process.env.NODE_ENV === 'production') {
  console.warn(
    '\n⚠️  [next.config.js] BACKEND_API_URL is not set!\n' +
    '   API calls will fail on Vercel. Set it in:\n' +
    '   Vercel Dashboard → Project → Settings → Environment Variables\n'
  );
}

const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  // Allow images from common hosting providers
  images: {
    domains: ['localhost'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.railway.app' },
      { protocol: 'https', hostname: '*.render.com' },
      { protocol: 'https', hostname: '*.vercel.app' },
      { protocol: 'https', hostname: '*.github.dev' },
    ],
  },
};

module.exports = nextConfig;
