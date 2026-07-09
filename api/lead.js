import { ensureTable, sql } from './_db.js';

// Public endpoint: the landing-page form POSTs here. Saves one lead.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { name, company, email, stage, website } = body;

    // Honeypot: real users never fill this. If present, pretend success and drop it.
    if (website) {
      res.status(200).json({ ok: true });
      return;
    }

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      res.status(400).json({ error: 'Please enter a valid email.' });
      return;
    }

    const clean = (v, n) => String(v ?? '').trim().slice(0, n);

    await ensureTable();
    await sql`
      INSERT INTO leads (name, company, email, stage)
      VALUES (
        ${clean(name, 200)},
        ${clean(company, 200)},
        ${clean(email, 200)},
        ${clean(stage, 300)}
      )`;

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('lead insert failed:', err);
    res.status(500).json({ error: 'Could not save your details. Please email me directly.' });
  }
}
