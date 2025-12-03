/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [25, 50, 75, 85, 100],
  },
  async rewrites() {
    return [
      {
        source: '/static/:path*',
        destination: 'http://localhost:3005/static/:path*', // 代理到後端
      },
    ];
  },
};

export default nextConfig;
