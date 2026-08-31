// Apply db/init.sql to whatever database DATABASE_URL points at.
// Usage: npm run db:init   (after copying .env.example -> .env.local)
//
// Handy when you use a hosted Postgres like Supabase instead of the bundled
// docker-compose Postgres (which applies the schema automatically on first run).
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }

  const sql = fs.readFileSync(
    path.join(__dirname, "..", "db", "init.sql"),
    "utf8"
  );

  const client = new Client({
    connectionString,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("✔ Database initialized.");
}

main().catch((err) => {
  console.error("Database init failed:", err.message);
  process.exit(1);
});
