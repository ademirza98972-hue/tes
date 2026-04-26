const SUPABASE_URL = 'https://wxxyvijfqzhhkeewvklz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eHl2aWpmcXpoaGtlZXd2a2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjI3MTAsImV4cCI6MjA5MjY5ODcxMH0.aoocrLIEFMN7b511CO9NyFUcLzVvq5MOzf0RMdezu0c';

function parseCookie(str) {
  const obj = {};
  (str || '').split(';').forEach(c => {
    const idx = c.indexOf('=');
    if (idx > 0) obj[c.slice(0, idx).trim()] = c.slice(idx + 1).trim();
  });
  return obj;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const cookies = parseCookie(req.headers.cookie);
  const sessionRaw = cookies['nova_session'];
  if (!sessionRaw) return res.status(401).json({ error: 'Not logged in' });

  try {
    const session = JSON.parse(Buffer.from(sessionRaw, 'base64').toString());

    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${session.id}&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    const users = await dbRes.json();
    const user = users?.[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Premium = unlimited
    if (user.is_premium) return res.status(200).json({ ok: true, isPremium: true, exportLeft: 999 });

    // Reset harian
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

    // Cek limit export
    if (count >= 3) {
      return res.status(403).json({ error: 'Limit export harian habis', limitReached: true, exportLeft: 0 });
    }

    // Increment
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
