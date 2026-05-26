import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// In standard standalone environments, we allow db to be optional and fall back to MemStorage
export const db = (() => {
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️ DATABASE_URL is not set. Persistent database features will be disabled; falling back to in-memory storage.");
    return null;
  }
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  return drizzle({ client: pool, schema });
})();