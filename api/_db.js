import { createPool } from '@vercel/postgres';

// Connect using whichever env var Vercel's Postgres/Neon integration created.
// (Different Vercel plans expose POSTGRES_URL or DATABASE_URL — support both.)
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED;

const pool = createPool(connectionString ? { connectionString } : undefined);
export const sql = pool.sql.bind(pool);

// Create tables once, on demand. Safe to call on every request.
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
  await sql`CREATE TABLE IF NOT EXISTS tasks (
    id         SERIAL PRIMARY KEY,
    lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    due_date   DATE,
    done       BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}
