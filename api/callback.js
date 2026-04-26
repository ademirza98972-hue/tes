const SUPABASE_URL = 'https://wxxyvijfqzhhkeewvklz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eHl2aWpmcXpoaGtlZXd2a2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjI3MTAsImV4cCI6MjA5MjY5ODcxMH0.aoocrLIEFMN7b511CO9NyFUcLzVvq5MOzf0RMdezu0c';
const CLIENT_ID = '1497802915585200159';
const CLIENT_SECRET = 'BqxBXOaMa5eyZsEI18W4pKrv2UBfSfXB';

module.exports = async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');

  const REDIRECT_URI = `https://${req.headers.host}/api/callback`;

  try {
    // 1. Tukar code → access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.redirect('/?error=token_failed');

    // 2. Ambil info user
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();
    if (!user.id) return res.redirect('/?error=user_failed');

    // 3. Simpan user ke Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        bypass_reset_date: new Date().toISOString().split('T')[0],
      }),
    });

    // 4. Set cookie & langsung balik ke website
    const session = Buffer.from(JSON.stringify({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    })).toString('base64');

    res.setHeader('Set-Cookie', `nova_session=${session}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.redirect('/?error=server_error');
  }
};
