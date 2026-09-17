export default function handler(req, res) {
  const ADMIN_USER = process.env.ADMIN_USERNAME || 'evgb_scert';
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'ranjishm';

  if (req.method === 'POST') {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      res.setHeader('Set-Cookie', 'admin_auth=1; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400');
      return res.json({ success: true });
    }
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', 'admin_auth=; Path=/; HttpOnly; Max-Age=0');
    return res.json({ success: true });
  }
  return res.status(405).json({ success: false });
}