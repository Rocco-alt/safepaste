// billing.js — Stripe billing integration
//
// Handles checkout session creation, webhook processing, and free signup.
// If STRIPE_SECRET_KEY is not set, all functions gracefully return null.

const { getDb } = require("./db");
const { createKey } = require("./key-manager");
const { generateKey, API_KEYS } = require("./auth");

let stripe = null;

/**
 * Initialize Stripe with the secret key from environment.
 * Returns true if Stripe is available, false otherwise.
 */
function initStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.log("[Billing] STRIPE_SECRET_KEY not set — billing disabled");
    return false;
  }
  stripe = require("stripe")(secretKey);
  console.log("[Billing] Stripe initialized");
  return true;
}

/**
 * Get the Stripe instance (or null if not configured).
 */
function getStripe() {
  return stripe;
}

// ---------------------------------------------------------------------------
// Customers table
// ---------------------------------------------------------------------------

/**
 * Create the customers table if it doesn't exist.
 * Called during initDb().
 */
async function createCustomersTable() {
  const db = getDb();
  if (!db) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id              SERIAL PRIMARY KEY,
      email           VARCHAR(255) NOT NULL,
      stripe_customer_id   VARCHAR(255),
      stripe_session_id    VARCHAR(255),
      api_key_id      VARCHAR(100),
      api_key_string  VARCHAR(255),
      plan            VARCHAR(50) DEFAULT 'free' NOT NULL,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)"
  );
  await db.query(
    "CREATE INDEX IF NOT EXISTS idx_customers_session ON customers(stripe_session_id)"
  );
  console.log("[Billing] Customers table ready");
}

// ---------------------------------------------------------------------------
// Checkout session
// ---------------------------------------------------------------------------

/**
 * Create a Stripe Checkout session for the Pro plan.
 * @param {string} email - Customer email (optional, Stripe will collect if missing)
 * @param {string} successUrl - URL to redirect after payment
 * @param {string} cancelUrl - URL to redirect if cancelled
 * @returns {object|null} { url, sessionId } or null if Stripe not configured
 */
async function createCheckoutSession(email, successUrl, cancelUrl) {
  if (!stripe) return null;

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    console.error("[Billing] STRIPE_PRO_PRICE_ID not set");
    return null;
  }

  const params = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { source: "safepaste-website" }
  };

  // Pre-fill email if provided
  if (email) {
    params.customer_email = email;
  }

  const session = await stripe.checkout.sessions.create(params);
  return { url: session.url, sessionId: session.id };
}

// ---------------------------------------------------------------------------
// Webhook: checkout.session.completed
// ---------------------------------------------------------------------------

/**
 * Handle a completed checkout — provision a Pro API key.
 * @param {object} session - Stripe checkout session object
 * @returns {object|null} { email, apiKey, keyId } or null on failure
 */
async function handleCheckoutCompleted(session) {
  const email = session.customer_details?.email || session.customer_email;
  if (!email) {
    console.error("[Billing] No email in checkout session");
    return null;
  }

  // Generate a new Pro API key
  const keyId = `pro-${email.split("@")[0]}-${Date.now()}`;
  const keyString = generateKey("sp");

  // Save to api_keys table
  const row = await createKey(keyId, keyString, "pro", 300);
  if (!row) {
    console.error("[Billing] Failed to create API key — DB unavailable");
    return null;
  }

  // Add to in-memory cache immediately
  API_KEYS.set(keyString, {
    id: keyId,
    plan: "pro",
    rateLimit: 300,
    requestCount: 0,
    windowStart: Date.now()
  });

  // Save customer record
  const db = getDb();
  if (db) {
    try {
      await db.query(
        `INSERT INTO customers (email, stripe_customer_id, stripe_session_id, api_key_id, api_key_string, plan)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          email,
          session.customer || null,
          session.id,
          keyId,
          keyString,
          "pro"
        ]
      );
    } catch (err) {
      console.error("[Billing] Failed to save customer:", err.message);
    }
  }

  console.log(`[Billing] Provisioned Pro key for ${email}: ${keyId}`);
  return { email, apiKey: keyString, keyId };
}

// ---------------------------------------------------------------------------
// Free signup
// ---------------------------------------------------------------------------

/**
 * Create a free-tier API key for a given email.
 * @param {string} email
 * @returns {object|null} { email, apiKey, keyId } or null on failure
 */
async function createFreeKey(email) {
  const keyId = `free-${email.split("@")[0]}-${Date.now()}`;
  const keyString = generateKey("sp");

  // Save to api_keys table
  const row = await createKey(keyId, keyString, "free", 30);
  if (!row) {
    console.error("[Billing] Failed to create free key — DB unavailable");
    return null;
  }

  // Add to in-memory cache
  API_KEYS.set(keyString, {
    id: keyId,
    plan: "free",
    rateLimit: 30,
    requestCount: 0,
    windowStart: Date.now()
  });

  // Save customer record
  const db = getDb();
  if (db) {
    try {
      await db.query(
        `INSERT INTO customers (email, api_key_id, api_key_string, plan)
         VALUES ($1, $2, $3, $4)`,
        [email, keyId, keyString, "free"]
      );
    } catch (err) {
      console.error("[Billing] Failed to save customer:", err.message);
    }
  }

  console.log(`[Billing] Provisioned Free key for ${email}: ${keyId}`);
  return { email, apiKey: keyString, keyId };
}

// ---------------------------------------------------------------------------
// Lookup key by session ID (for success page)
// ---------------------------------------------------------------------------

/**
 * Look up the API key provisioned for a Stripe session.
 * @param {string} sessionId
 * @returns {object|null} { email, apiKey, plan } or null
 */
async function getKeyBySession(sessionId) {
  const db = getDb();
  if (!db) return null;

  const result = await db.query(
    "SELECT email, api_key_string, plan FROM customers WHERE stripe_session_id = $1",
    [sessionId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return { email: row.email, apiKey: row.api_key_string, plan: row.plan };
}

module.exports = {
  initStripe,
  getStripe,
  createCustomersTable,
  createCheckoutSession,
  handleCheckoutCompleted,
  createFreeKey,
  getKeyBySession
};
