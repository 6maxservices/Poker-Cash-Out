import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL is not set during build time. Using a placeholder for compilation.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
