import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "tesseract.js",
  ],
  // Allow access from local network (iPhone on same Wi-Fi)
  allowedDevOrigins: ["192.168.0.178", "192.168.1.*", "10.0.0.*", "172.16.*"],
};

export default nextConfig;
