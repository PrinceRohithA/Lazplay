import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

function normalizeDatabaseUrl(connectionString) {
  return connectionString.replace(/^postgresql\+psycopg:\/\//i, "postgresql://");
}

export const pool = new Pool({
  connectionString: normalizeDatabaseUrl(env.DATABASE_URL),
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});

export function query(text, params = []) {
  return pool.query(text, params);
}
