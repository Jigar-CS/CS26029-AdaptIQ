/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@clias/shared-types', '@clias/config'],

  // Proxy /api/v1/* to the NestJS backend to:
  // 1. Avoid CORS preflight on every request (same-origin proxied calls)
  // 2. Hide the backend port from the browser
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ||
      'http://localhost:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },

  // Reduce background compilation overhead in dev mode
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  // Experimental performance flags
  experimental: {
    // Optimize package imports for faster page loads
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
