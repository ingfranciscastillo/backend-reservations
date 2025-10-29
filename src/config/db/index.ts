import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../env.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: config.nodeEnv === "production" ? { rejectUnauthorized: false } : false,
});

export const db = drizzle({ client: pool });

export const query = (text, params) => pool.query(text, params);
