const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Deep-import walletConnect without pulling the @wagmi/connectors barrel
    // (its Coinbase/Base connectors import optional peers we don't install).
    config.resolve.alias["@wagmi/connectors/walletConnect"] = path.resolve(
      __dirname,
      "node_modules/@wagmi/connectors/dist/esm/walletConnect.js"
    );
    return config;
  },
  async redirects() {
    return [
      { source: "/vplay", destination: "/vurafy", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/vurafy" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

module.exports = nextConfig;
