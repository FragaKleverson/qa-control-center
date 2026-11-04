import { defineConfig } from "prisma/config";
import { assertPrismaIntegrationExecution } from "./src/config/integrationTarget";

// Opt-in config: only the verified runner supplies its short-lived identity marker.
assertPrismaIntegrationExecution(process.env);
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL },
});
