const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { secret, userId, limit = 50 } = req.query;
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });

  let url = `${SUPABASE_URL}/rest/v1/activity_logs?select=*,users(username,avatar)&order=created_at.desc&limit=${limit}`;
  if (userId) url += `&user_id=eq.${userId}`;

  const dbRes = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  const logs = await dbRes.json();
  res.status(200).json(Array.isArray(logs) ? logs : []);
};
