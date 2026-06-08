/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
      },
      {
        protocol: 'https',
        hostname: '*.onrender.com',
      },
    ],
  },
  output: 'standalone',
  async rewrites() {
    let backendUrl = 'http://localhost:4000';
    if (process.env.BACKEND_HOST) {
      backendUrl = process.env.BACKEND_HOST.includes('.') 
        ? `https://${process.env.BACKEND_HOST}` 
        : `https://${process.env.BACKEND_HOST}.onrender.com`;
    } else if (process.env.NEXT_PUBLIC_API_URL) {
      backendUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '');
    }
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;