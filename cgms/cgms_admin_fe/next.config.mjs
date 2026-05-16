/** @type {import('next').NextConfig} */
const apiProxy = (process.env.API_PROXY_TARGET || '').trim()

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  async rewrites() {
    if (!apiProxy) return []
    const base = apiProxy.replace(/\/$/, '')
    return [{ source: '/api/:path*', destination: `${base}/api/:path*` }]
  }
}

export default nextConfig
