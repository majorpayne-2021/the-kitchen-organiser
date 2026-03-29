import { defineConfig } from "prisma/config";

const DEV_DB = "file:./data/dev/kitchen.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"] || DEV_DB,
  },
});
