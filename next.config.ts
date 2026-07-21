import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Static export. Nothing may depend on a server at runtime - this turns the
  // offline constraint into a build error rather than a discipline to remember.
  output: 'export',
  reactCompiler: true,
  // Pin the project root. Without this, Turbopack walks up and finds an unrelated
  // package-lock.json in the home directory, then guesses the wrong workspace root.
  turbopack: {
    root: import.meta.dirname,
  },
}

export default nextConfig
