// key-manager.js — CRUD operations for API keys in PostgreSQL
//
// Every function gracefully returns null (or []) when the database
// is not available, so the rest of the app keeps working in-memory.

const { getDb } = require("./db");

/**
 * Fetch all active (non-revoked) keys from the database.
 * @returns {Array|null} Array of key rows, or null if DB unavailable.
 */
async function loadAllKeys() {
  const db = getDb();
  if (!db) return null;

  const result = await db.query(
    "SELECT id, key_string, plan, rate_limit FROM api_keys WHERE revoked_at IS NULL"
  );
  return result.rows;
}

/**
 * Insert a new API key.
 * @returns {object|null} The inserted row, or null if DB unavailable.
 */
async function createKey(id, keyString, plan = "free", rateLimit = 60) {
  const db = getDb();
  if (!db) return null;

  const result = await db.query(
    "INSERT INTO api_keys (id, key_string, plan, rate_limit) VALUES ($1, $2, $3, $4) RETURNING *",
    [id, keyString, plan, rateLimit]
  );
  return result.rows[0];
}

/**
 * Soft-delete a key by setting its revoked_at timestamp.
 * @returns {boolean|null} true if revoked, null if DB unavailable.
 */
async function revokeKey(id) {
  const db = getDb();
  if (!db) return null;

  const result = await db.query(
    "UPDATE api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1 AND revoked_at IS NULL",
    [id]
  );
  return result.rowCount > 0;
}

module.exports = { loadAllKeys, createKey, revokeKey };
