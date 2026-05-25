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
};

export default nextConfig;
