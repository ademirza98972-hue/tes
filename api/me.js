const SUPABASE_URL = 'https://wxxyvijfqzhhkeewvklz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eHl2aWpmcXpoaGtlZXd2a2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjI3MTAsImV4cCI6MjA5MjY5ODcxMH0.aoocrLIEFMN7b511CO9NyFUcLzVvq5MOzf0RMdezu0c';

function parseCookie(str) {
  return Object.fromEntries((str || '').split(';').map(c => c.trim().split('=')));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const cookies = parseCookie(req.headers.cookie);
  const sessionRaw = cookies['nova_session'];

  if (!sessionRaw) return res.status(200).json({ loggedIn: false });

  try {
    const session = JSON.parse(Buffer.from(sessionRaw, 'base64').toString());

    // Ambil data user dari Supabase
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${session.id}&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    const users = await dbRes.json();
    const user = users?.[0];
    if (!user) return res.status(200).json({ loggedIn: false });

    // Reset bypass count jika beda hari
    const today = new Date().toISOString().split('T')[0];
    if (user.bypass_reset_date !== today) {
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bypass_count: 0, bypass_reset_date: today }),
      });
      user.bypass_count = 0;
      user.bypass_reset_date = today;
    }

    res.status(200).json({
      loggedIn: true,
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      isPremium: user.is_premium,
      bypassCount: user.bypass_count,
      bypassLeft: user.is_premium ? 999 : Math.max(0, 3 - user.bypass_count),
    });
  } catch (err) {
    res.status(200).json({ loggedIn: false });
  }
}
