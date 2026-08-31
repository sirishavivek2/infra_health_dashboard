import { Pool } from "pg";

// A single shared connection pool for the whole app.
//
// The pool is created LAZILY — on the first query, not when this module loads.
// That matters because `next build` loads every route module to analyze it, and
// at build time DATABASE_URL is not set. Creating the pool eagerly here would
// throw during the build. Connecting lazily means the module is always safe to
// import; we only need a real DATABASE_URL when an actual request runs a query.
//
// In development Next.js hot-reloads modules, which would otherwise create a new
// pool on every change and exhaust Postgres connections. We cache the pool on
// the global object to survive those reloads.
const globalForPool = globalThis;

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Fail loudly and early with a helpful message rather than a cryptic
    // driver error deep in a request handler.
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in."
    );
  }
  return new Pool({
    connectionString,
    // Managed Postgres (Supabase, RDS, Azure) usually requires TLS. Toggle it
    // with an env var so local Docker Postgres (no TLS) still works.
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
    max: 10,
  });
}

function getPool() {
  if (!globalForPool._pgPool) {
    globalForPool._pgPool = createPool();
  }
  return globalForPool._pgPool;
}

/**
 * Run a parameterized SQL query. Always pass user input through `params`
 * (never string-concatenate it) to prevent SQL injection.
 */
export function query(text, params) {
  return getPool().query(text, params);
}

export default getPool;
