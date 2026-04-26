export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'nova_session=; Path=/; Max-Age=0');
  res.redirect('/');
}
