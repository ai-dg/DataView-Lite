/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // better-sqlite3 is a native module, never bundle it.
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
