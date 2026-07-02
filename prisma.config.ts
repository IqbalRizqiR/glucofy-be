// Prisma v7 Configuration
// ──────────────────────────────────────────────
// In Prisma v7, `directUrl` inside schema.prisma is DEPRECATED.
// The CLI (migrations, introspect, studio) uses the `url` defined HERE.
// The runtime PrismaClient uses DATABASE_URL via the @prisma/adapter-pg driver adapter.
//
// DIRECT_URL  → bypasses PgBouncer → used by Prisma CLI for migrations
// DATABASE_URL → goes through PgBouncer pooler → used by app at runtime

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node prisma/seed.ts",
  },
  // Prisma CLI (migrate, studio, introspect) uses DIRECT connection
  // This bypasses the connection pooler (PgBouncer) which doesn't support
  // the DDL statements that migrations require
  datasource: {
    url: env("DIRECT_URL"),
  },
});
