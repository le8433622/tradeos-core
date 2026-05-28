import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@tradeos/ai-core",
    "@tradeos/database",
    "@tradeos/policy-core",
    "@tradeos/crm-core",
    "@tradeos/trade-core",
    "@tradeos/sourcing-core",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

export default nextConfig;
