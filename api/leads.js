import { ensureTable, sql } from './_db.js';

// Admin endpoint (used by /admin.html). Protected by a shared password
// stored in the ADMIN_PASSWORD env var. GET = list leads, PATCH = update one.
function authorized(req) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false; // no password set → locked down by default
  const header = req.headers['authorization'] || '';
  return header === `Bearer ${pw}`;
}

const STATUSES = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];

export default async function handler(req, res) {
  if (!authorized(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM leads ORDER BY created_at DESC`;
      res.status(200).json({ leads: rows });
      return;
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { id, status, notes } = body;
      if (!id) {
        res.status(400).json({ error: 'id is required' });
        return;
      }
      if (status !== undefined) {
        if (!STATUSES.includes(status)) {
          res.status(400).json({ error: 'Invalid status' });
          return;
        }
        await sql`UPDATE leads SET status = ${status} WHERE id = ${id}`;
      }
      if (notes !== undefined) {
        await sql`UPDATE leads SET notes = ${String(notes).slice(0, 5000)} WHERE id = ${id}`;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('leads admin failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
