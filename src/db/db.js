import pkg from "pg";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DB_SSL === "false"
      ? false
      : {
          rejectUnauthorized:
            process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
        },
});

export const db = drizzle(pool);
