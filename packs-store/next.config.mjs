/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/packs',
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.r2.cloudflarestorage.com' }],
  },
};

export default nextConfig;
