import { ensureTable, sql } from './_db.js';

// Emails you an alert on every new lead. Off until RESEND_API_KEY is set.
async function notifyNewLead(lead) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // no key configured → notifications simply skipped
  const to = process.env.NOTIFY_TO || 'asdocktor@gmail.com';
  const esc = (v) => String(v ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'True Source Bio Leads <onboarding@resend.dev>',
      to: [to],
      reply_to: lead.email || undefined,
      subject: `🔔 New lead: ${esc(lead.name)}${lead.company ? ' — ' + esc(lead.company) : ''}`,
      html: `<h2 style="font-family:sans-serif">New lead from truesourcebio.com</h2>
        <p style="font-family:sans-serif;font-size:15px;line-height:1.6">
          <b>Name:</b> ${esc(lead.name)}<br>
          <b>Company:</b> ${esc(lead.company) || '—'}<br>
          <b>Email:</b> ${esc(lead.email)}<br>
          <b>Where they are:</b> ${esc(lead.stage) || '—'}
        </p>
        <p style="font-family:sans-serif"><a href="https://truesourcebio.com/admin.html">Open your CRM →</a></p>`,
    }),
  });
  if (!res.ok) throw new Error('resend ' + res.status);
}

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

    // Best-effort email alert — never let a notification failure block the lead save.
    try {
      await notifyNewLead({ name: clean(name, 200), company: clean(company, 200), email: clean(email, 200), stage: clean(stage, 300) });
    } catch (e) {
      console.error('lead notification failed:', e);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('lead insert failed:', err);
    res.status(500).json({ error: 'Could not save your details. Please email me directly.' });
  }
}
