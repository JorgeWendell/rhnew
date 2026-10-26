import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "exceljs"],
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
