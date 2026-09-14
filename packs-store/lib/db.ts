import { neon } from '@neondatabase/serverless';

declare global {
  // eslint-disable-next-line no-var
  var __messPacksSchema: Promise<void> | undefined;
}

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não configurada.');
  return neon(url);
}

async function createSchema() {
  const db = sql();
  await db`CREATE TABLE IF NOT EXISTS packs (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL CHECK(price_cents > 0),
    tracks_count INTEGER NOT NULL DEFAULT 0 CHECK(tracks_count >= 0),
    cover_key TEXT,
    preview_key TEXT,
    bundle_key TEXT,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await db`CREATE INDEX IF NOT EXISTS idx_packs_active ON packs(active, created_at DESC)`;
  await db`CREATE TABLE IF NOT EXISTS pack_orders (
    id TEXT PRIMARY KEY,
    public_token TEXT NOT NULL UNIQUE,
    pack_id TEXT NOT NULL REFERENCES packs(id) ON DELETE RESTRICT,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploading' CHECK(status IN ('uploading','pending','approved','rejected')),
    proof_key TEXT NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ
  )`;
  await db`CREATE INDEX IF NOT EXISTS idx_orders_status ON pack_orders(status, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_orders_token ON pack_orders(public_token)`;
  await db`CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function ensureSchema() {
  global.__messPacksSchema ??= createSchema();
  return global.__messPacksSchema;
}

export async function allowAction(key: string, limit: number, minutes: number) {
  await ensureSchema();
  const db = sql();
  const [row] = await db`INSERT INTO rate_limits (key, attempts, window_start) VALUES (${key}, 1, NOW())
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN rate_limits.window_start < NOW() - (${minutes} * INTERVAL '1 minute') THEN 1 ELSE rate_limits.attempts + 1 END,
      window_start = CASE WHEN rate_limits.window_start < NOW() - (${minutes} * INTERVAL '1 minute') THEN NOW() ELSE rate_limits.window_start END
    RETURNING attempts` as unknown as Array<{ attempts: number }>;
  return row.attempts <= limit;
}
