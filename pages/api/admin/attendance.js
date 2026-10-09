import { supabase, supabaseAdmin } from '../../../lib/supabase';

const ADMIN_USER = process.env.ADMIN_USERNAME || 'evgb_scert';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'ranjishm';
const CURRENT_CYCLE = 2;

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(part => {
    const [key, ...val] = part.trim().split('=');
    if (key) cookies[key.trim()] = val.join('=').trim();
  });
  return cookies;
}

function checkAuth(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies.admin_auth === Buffer.from(ADMIN_USER + ':' + ADMIN_PASS).toString('base64');
}

export default async function handler(req, res) {
  if (!checkAuth(req)) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { cycle, date, batch, district } = req.query;
    const filterCycle = cycle ? parseInt(cycle) : CURRENT_CYCLE;
    let q = supabase.from('attendance').select('*').eq('cycle', filterCycle)
      .order('checkin_time', { ascending: true });
    if (date) {
      q = q.gte('checkin_time', date + 'T00:00:00+05:30').lte('checkin_time', date + 'T23:59:59+05:30');
    }
    if (batch) q = q.eq('batch', batch);
    if (district) q = q.eq('district', district);
    const { data, error } = await q;
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, data, cycle: filterCycle });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    const { error } = await supabaseAdmin.from('attendance').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
