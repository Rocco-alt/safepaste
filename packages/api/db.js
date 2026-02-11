// db.js — PostgreSQL connection pool + schema initialization
//
// If DATABASE_URL is set, connects to PostgreSQL and creates the api_keys
// table on first run. If not set, does nothing (local dev uses in-memory keys).

const { Pool } = require("pg");

let pool = null;

/**
 * Returns the active database pool, or null if no database is configured.
 */
function getDb() {
  return pool;
}

/**
 * Initialize the database connection and create the schema.
 * Safe to call multiple times (uses IF NOT EXISTS).
 * If DATABASE_URL is not set, logs a message and returns silently.
 */
async function initDb() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.log("[DB] DATABASE_URL not set — using in-memory keys");
    return;
  }

  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }, // Railway uses self-signed certs
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });

    // Verify the connection works
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log("[DB] Connected to PostgreSQL");

    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id          VARCHAR(100) PRIMARY KEY,
        key_string  VARCHAR(255) UNIQUE NOT NULL,
        plan        VARCHAR(50)  DEFAULT 'free' NOT NULL,
        rate_limit  INT          DEFAULT 60 NOT NULL,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        revoked_at  TIMESTAMP    NULL
      )
    `);
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_api_keys_key_string ON api_keys(key_string)"
    );
    console.log("[DB] Schema ready");

    // Seed demo + pro keys if they don't already exist
    await seedKeys();
  } catch (err) {
    console.error("[DB] Connection failed:", err.message);
    console.log("[DB] Falling back to in-memory keys");
    pool = null;
  }
}

/**
 * Insert the demo and pro keys into the database if they are missing.
 * Reads key values from env vars (same fallbacks as auth.js).
 */
async function seedKeys() {
  const DEMO_KEY = process.env.SAFEPASTE_DEMO_KEY || "sp_demo_key_12345";
  const PRO_KEY = process.env.SAFEPASTE_PRO_KEY || "sp_pro_key_67890";

  const seeds = [
    { id: "demo", key: DEMO_KEY, plan: "free", rateLimit: 30 },
    { id: "test-pro", key: PRO_KEY, plan: "pro", rateLimit: 300 }
  ];

  for (const s of seeds) {
    const exists = await pool.query(
      "SELECT 1 FROM api_keys WHERE id = $1",
      [s.id]
    );
    if (exists.rows.length === 0) {
      await pool.query(
        "INSERT INTO api_keys (id, key_string, plan, rate_limit) VALUES ($1, $2, $3, $4)",
        [s.id, s.key, s.plan, s.rateLimit]
      );
      console.log(`[DB] Seeded key: ${s.id}`);
    }
  }
}

module.exports = { getDb, initDb };
