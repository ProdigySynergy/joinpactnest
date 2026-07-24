const path = require("path");

// Monorepo: load root `.env` so NEXT_PUBLIC_* is available at build time.
// Next only auto-loads env files from `apps/web/` by default.
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
} catch {
  // dotenv may be unavailable in some install layouts; export vars or use apps/web/.env.production
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "4000" },
      { protocol: "http", hostname: "buyanddiscuss.com" },
      { protocol: "https", hostname: "buyanddiscuss.com" },
      { protocol: "https", hostname: "api.vowbird.app" },
    ],
  },
};

module.exports = nextConfig;
