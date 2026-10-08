/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/whitelist", destination: "/", permanent: true },
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
