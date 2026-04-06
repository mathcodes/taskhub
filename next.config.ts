import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "pdf-parse",
    "mammoth",
    "xlsx",
  ],
};

export default nextConfig;
