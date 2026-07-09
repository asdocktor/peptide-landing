import { ensureTable, sql } from './_db.js';

// Admin endpoint for follow-up tasks. Password-protected like /api/leads.
// GET  -> open tasks (with lead name), soonest due first
// POST -> create a task { lead_id, title, due_date }
// PATCH-> mark done/undone { id, done }
function authorized(req) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  return (req.headers['authorization'] || '') === `Bearer ${pw}`;
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const { rows } = await sql`
        SELECT t.*, l.name AS lead_name, l.email AS lead_email
        FROM tasks t JOIN leads l ON l.id = t.lead_id
        WHERE t.done = false
        ORDER BY t.due_date NULLS LAST, t.created_at`;
      res.status(200).json({ tasks: rows });
      return;
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { lead_id, title, due_date } = body;
      if (!lead_id || !title) {
        res.status(400).json({ error: 'lead_id and title are required' });
        return;
      }
      const due = due_date ? String(due_date).slice(0, 10) : null;
      await sql`INSERT INTO tasks (lead_id, title, due_date)
                VALUES (${lead_id}, ${String(title).slice(0, 300)}, ${due})`;
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { id, done } = body;
      if (!id) {
        res.status(400).json({ error: 'id is required' });
        return;
      }
      await sql`UPDATE tasks SET done = ${done !== false} WHERE id = ${id}`;
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('tasks failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
