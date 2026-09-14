/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/packs',
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.r2.cloudflarestorage.com' }],
  },
};

export default nextConfig;
