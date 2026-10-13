import { supabase, supabaseAdmin } from '../../../lib/supabase';

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
  return cookies.admin_auth === '1';
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

  // Admin manual check-in: creates attendance record for a participant
  if (req.method === 'POST') {
    const { evgc_id, school_id, name, district, zone, school_name, batch, email, cycle: bodyCycle } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Missing name' });
    const useCycle = bodyCycle ? parseInt(bodyCycle) : CURRENT_CYCLE;
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from('attendance').insert({
      evgc_id: evgc_id || null,
      school_id: school_id || null,
      name, district, zone, school_name, batch,
      email: email || null,
      checkin_time: now,
      checkin_distance_m: 0,
      checkin_ip: 'admin',
      cycle: useCycle,
    }).select().single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, data });
  }

  // Admin edit / mark checkout
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    const { error } = await supabaseAdmin.from('attendance').update(updates).eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
