const SUPABASE_URL = 'https://wxxyvijfqzhhkeewvklz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eHl2aWpmcXpoaGtlZXd2a2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjI3MTAsImV4cCI6MjA5MjY5ODcxMH0.aoocrLIEFMN7b511CO9NyFUcLzVvq5MOzf0RMdezu0c';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Parse body manually jika belum terparsing
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }
  if (!body) return res.status(400).json({ error: 'Empty body' });

  const { secret, userId, action } = body;
  const ADMIN_SECRET = process.env.ADMIN_SECRET;

  if (!ADMIN_SECRET) return res.status(500).json({ error: 'ADMIN_SECRET not configured' });
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });
  if (!userId || !action) return res.status(400).json({ error: 'Missing userId or action' });

  const isPremium = action === 'activate';

  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ is_premium: isPremium }),
  });

  const result = await patchRes.json();
  if (!result || result.length === 0) {
    return res.status(404).json({ error: 'User tidak ditemukan di database. Pastikan user sudah pernah login.' });
  }

  res.status(200).json({ ok: true, userId, isPremium, user: result[0] });
};
