const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_INVITE = 'https://discord.gg/saNDWMhVt9';

module.exports = async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.redirect('/?error=no_code');

  const REDIRECT_URI = `https://${req.headers.host}/api/callback`;
  const userIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';

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

    // 3. Cek apakah IP ini sudah dipakai akun Discord lain
    const ipCheckRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?last_ip=eq.${userIP}&id=neq.${user.id}&select=id,username&limit=1`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const existingUsers = await ipCheckRes.json();

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      // IP sudah dipakai akun lain → tolak
      return res.redirect('/?error=ip_blocked');
    }

    // 4. Simpan/update user ke Supabase + catat IP
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
        last_ip: userIP,
        bypass_reset_date: new Date().toISOString().split('T')[0],
      }),
    });

    // 5. Set cookie & redirect
    const session = Buffer.from(JSON.stringify({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    })).toString('base64');

    res.setHeader('Set-Cookie', `nova_session=${session}; Path=/; HttpOnly; Secure; Max-Age=2592000; SameSite=Lax`);
    res.redirect('/studio');
  } catch (err) {
    console.error(err);
    res.redirect('/?error=server_error');
  }
};
