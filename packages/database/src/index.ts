import { PrismaClient } from "@prisma/client";
import { applyTenantGuard } from "./tenant-guard";
export * from "./system-roles";

export { PrismaClient } from "@prisma/client";
export * from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

applyTenantGuard(prisma);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
