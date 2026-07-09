import { sql } from '@vercel/postgres';

// Create the leads table once, on demand. Safe to call on every request.
export async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS leads (
    id         SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name       TEXT NOT NULL,
    company    TEXT,
    email      TEXT NOT NULL,
    stage      TEXT,
    status     TEXT NOT NULL DEFAULT 'New',
    notes      TEXT NOT NULL DEFAULT ''
  )`;
}

export { sql };
