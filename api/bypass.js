const SUPABASE_URL = 'https://wxxyvijfqzhhkeewvklz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eHl2aWpmcXpoaGtlZXd2a2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjI3MTAsImV4cCI6MjA5MjY5ODcxMH0.aoocrLIEFMN7b511CO9NyFUcLzVvq5MOzf0RMdezu0c';

function parseCookie(str) {
  return Object.fromEntries((str || '').split(';').map(c => c.trim().split('=')));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const cookies = parseCookie(req.headers.cookie);
  const sessionRaw = cookies['nova_session'];
  if (!sessionRaw) return res.status(401).json({ error: 'Not logged in' });

  try {
    const session = JSON.parse(Buffer.from(sessionRaw, 'base64').toString());

    // Ambil user
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${session.id}&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    const users = await dbRes.json();
    const user = users?.[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Premium = unlimited
    if (user.is_premium) return res.status(200).json({ ok: true, isPremium: true });

    // Cek limit
    if (user.bypass_count >= 3) {
      return res.status(403).json({ error: 'Limit tercapai', limitReached: true });
    }

    // Increment
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bypass_count: user.bypass_count + 1 }),
    });

    res.status(200).json({
      ok: true,
      bypassUsed: user.bypass_count + 1,
      bypassLeft: 3 - (user.bypass_count + 1),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
