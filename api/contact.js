// Contact form endpoint for the Love Nature Krabi website.
// Sends the message to the team inbox through Resend.
//
// Environment variables (set in Vercel, never in the repo):
//   RESEND_API_KEY  required. A Resend API key with sending access.
//   CONTACT_FROM    required. A sender on a domain verified in Resend,
//                   e.g. "Love Nature Krabi Website <website@lovenaturekrabi.com>".
//   CONTACT_TO      optional. Defaults to contact@lovenaturekrabi.com.

const MAX = { name: 120, email: 200, phone: 60, tour: 200, dates: 120, message: 5000 };

function clean(value, max) {
  return String(value == null ? '' : value).replace(/\r/g, '').trim().slice(0, max);
}

function esc(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (err) { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'bad_request' });
  }

  // Honeypot: real visitors never fill this field. Answer as if it worked.
  if (clean(body.company, 200)) {
    return res.status(200).json({ ok: true });
  }

  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email);
  const phone = clean(body.phone, MAX.phone);
  const tour = clean(body.tour, MAX.tour);
  const dates = clean(body.dates, MAX.dates);
  const message = clean(body.message, MAX.message);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  if (name.length < 2 || !emailOk || message.length < 5) {
    return res.status(422).json({ ok: false, error: 'invalid_fields' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;
  const to = process.env.CONTACT_TO || 'contact@lovenaturekrabi.com';
  if (!apiKey || !from) {
    console.error('contact: RESEND_API_KEY or CONTACT_FROM is not set');
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  const rows = [
    ['Name', name],
    ['Email', email],
    ['Phone or WhatsApp', phone || 'Not given'],
    ['Tour of interest', tour || 'Not given'],
    ['Travel dates', dates || 'Not given'],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nMessage:\n${message}\n`;
  const html =
    '<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">' +
    rows.map(([k, v]) => `<tr><td style="color:#51626D">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('') +
    '</table>' +
    `<p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${esc(message)}</p>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Website message from ${name}`,
        text,
        html,
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error('contact: Resend refused the message', r.status, detail.slice(0, 500));
      return res.status(502).json({ ok: false, error: 'send_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact: request to Resend failed', err && err.message);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
