/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@clias/shared-types', '@clias/config'],
};

export default nextConfig;
