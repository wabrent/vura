/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@farcaster/mini-app-solana': false,
      '@farcaster/miniapp-sdk': false,
      '@solana/wallet-adapter-react': false,
      '@solana/wallet-adapter-base': false,
      '@solana/web3.js': false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' }
        ]
      }
    ];
  },
  async rewrites() {
    return [
      { source: '/stats', destination: '/?tab=stats' },
      { source: '/arbitrage', destination: '/?tab=arbitrage' },
      { source: '/correlation', destination: '/?tab=correlation' },
      { source: '/whale', destination: '/?tab=whale' },
      { source: '/alerts', destination: '/?tab=alerts' },
    ];
  }
};

module.exports = nextConfig;
