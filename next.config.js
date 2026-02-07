/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      '@remotion/bundler',
      '@remotion/renderer',
      '@remotion/cli',
      'remotion',
      'esbuild',
    ],
  },
}

module.exports = nextConfig
