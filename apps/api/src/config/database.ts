import { PrismaClient } from "@prisma/client";
import { registerGuardMiddleware } from "./tenant-guard";

// Single shared Prisma client. Doc 13 rule: organization_id scoping is
// applied at the repository layer on every query.
const isDev = process.env.NODE_ENV !== "production";

export const prisma = new PrismaClient({
  log: isDev ? ["warn", "error"] : ["error"],
});

registerGuardMiddleware(prisma);
