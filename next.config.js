/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal, self-contained server build in `.next/standalone`.
  // This is what the Dockerfile copies, keeping the final image small.
  output: "standalone",
  reactStrictMode: true,
};

module.exports = nextConfig;
