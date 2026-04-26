const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function parseCookie(str) {
  const obj = {};
  (str || '').split(';').forEach(c => {
    const idx = c.indexOf('=');
    if (idx > 0) obj[c.slice(0, idx).trim()] = c.slice(idx + 1).trim();
  });
  return obj;
}

// Rate limiter
const rateLimitMap = new Map();
function rateLimit(ip, max=10, windowMs=60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count > max;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (rateLimit(ip)) return res.status(429).json({ error: 'Too many requests' });

  const cookies = parseCookie(req.headers.cookie);
  const sessionRaw = cookies['nova_session'];
  if (!sessionRaw) return res.status(401).json({ error: 'Not logged in' });

  try {
    const session = JSON.parse(Buffer.from(sessionRaw, 'base64').toString());
    if (!session.id) return res.status(401).json({ error: 'Invalid session' });

    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${session.id}&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    const users = await dbRes.json();
    const user = users?.[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.is_premium) return res.status(200).json({ ok: true, isPremium: true, exportLeft: 999 });

    const today = new Date().toISOString().split('T')[0];
    let count = user.bypass_count;
    if (user.bypass_reset_date !== today) {
      count = 0;
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypass_count: 0, bypass_reset_date: today }),
      });
    }

    if (count >= 3) return res.status(403).json({ error: 'Limit export harian habis', limitReached: true, exportLeft: 0 });

    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bypass_count: count + 1, bypass_reset_date: today }),
    });

    res.status(200).json({ ok: true, exportUsed: count + 1, exportLeft: 3 - (count + 1) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
