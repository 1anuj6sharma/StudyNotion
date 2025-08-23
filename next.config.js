/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'], // Add your image domains here
  },
  // Add webpack configuration to handle the missing module
  webpack: (config, { isServer }) => {
    // Add a fallback for the missing module
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'babel-plugin-named-assets-import': false,
    };
    return config;
  },
};

module.exports = nextConfig;
