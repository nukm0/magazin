import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  distDir:process.env.LOCAL_DEV_MODE==="1"?".next-local":".next",
  experimental: {turbopackFileSystemCacheForDev:false,turbopackFileSystemCacheForBuild:false},
  async headers() { return [{ source: "/api/:path*", headers: [{key:"Cache-Control",value:"no-store"},{key:"X-Content-Type-Options",value:"nosniff"}] }]; }
};
export default config;
