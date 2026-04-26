const SUPABASE_URL = 'https://wxxyvijfqzhhkeewvklz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eHl2aWpmcXpoaGtlZXd2a2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjI3MTAsImV4cCI6MjA5MjY5ODcxMH0.aoocrLIEFMN7b511CO9NyFUcLzVvq5MOzf0RMdezu0c';
const ADMIN_SECRET = process.env.ADMIN_SECRET;

module.exports = async function handler(req, res) {
  const { secret } = req.query;
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Unauthorized' });

  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  const users = await dbRes.json();
  res.status(200).json(users);
}
