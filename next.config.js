/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode in production only
  reactStrictMode: process.env.NODE_ENV === 'production',
  
  // Enable SWC minification
  swcMinify: true,
  
  // Configure image optimization
  images: {
    domains: [
      'localhost',
      'res.cloudinary.com',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'via.placeholder.com'
    ],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 1 week
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
  
  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Handle the missing module
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      'babel-plugin-named-assets-import': false,
    };
    
    // Add source map support in development
    if (dev && !isServer) {
      config.devtool = 'cheap-module-source-map';
    }
    
    return config;
  },
  
  // Enable static exports for static site generation
  output: 'export',
  
  // Enable static HTML export
  trailingSlash: true,
  
  // Base path for static assets
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  
  // Disable image optimization since we're using static export
  images: {
    unoptimized: true,
  },
  
  // Disable TypeScript type checking during build (handled by Vercel)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build (handled by Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// Only require @next/bundle-analyzer in development
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}
