module.exports = function handler(req, res) {
  const CLIENT_ID = '1497802915585200159';
  const REDIRECT_URI = `https://${req.headers.host}/api/callback`;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
};
