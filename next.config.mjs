// next.config.mjs
import nextPWA from "next-pwa"

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // ✅ necesario para evitar el error Turbopack + config webpack (next-pwa)
  turbopack: {},
}

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})

export default withPWA(nextConfig)