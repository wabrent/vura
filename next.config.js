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
      afterFiles: [
        { source: "/terminal", destination: "/terminal.html" },
        { source: "/app", destination: "/terminal.html" },
        { source: "/gallery", destination: "/gallery.html" },
        { source: "/mint", destination: "/mint.html" },
      ],
      fallback: [],
    };
  },
};

module.exports = nextConfig;
