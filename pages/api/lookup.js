import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const { loginId } = req.query;
  if (!loginId) return res.status(400).json({ success: false, message: 'Please enter your Employee ID or School ID.' });
  try {
    const { data: byEvgc } = await supabase.from('participants').select('*').eq('evgc_id', loginId);
    const { data: bySchool } = await supabase.from('participants').select('*').eq('school_id', loginId);
    const seen = new Set();
    const matches = [...(byEvgc || []), ...(bySchool || [])].filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
    if (matches.length === 0) return res.json({ success: false, message: 'ID not found. Please check your Employee ID or School ID and try again.' });
    if (matches.length > 1) return res.json({ success: false, message: 'Multiple records found. Please use your School ID instead.' });
    const p = matches[0];
    const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const wrongDay = p.date_iso !== todayISO;
    const orFilter = [p.evgc_id ? 'evgc_id.eq.' + p.evgc_id : null, p.school_id ? 'school_id.eq.' + p.school_id : null].filter(Boolean).join(',');
    const { data: existing } = await supabase.from('attendance').select('*')
      .or(orFilter)
      .gte('checkin_time', todayISO + 'T00:00:00+05:30')
      .lte('checkin_time', todayISO + 'T23:59:59+05:30')
      .maybeSingle();
    let nextAction = 'checkin';
    if (wrongDay) nextAction = 'wrongday';
    else if (existing?.checkout_time) nextAction = 'complete';
    else if (existing) nextAction = 'checkout';
    const fmt = (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : null;
    return res.json({ success: true, nextAction, name: p.name, evgcId: p.evgc_id, schoolId: p.school_id,
      schoolName: p.school_name, district: p.district, zone: p.zone, postType: p.post_type,
      batch: p.batch, scheduledDate: p.scheduled_date,
      checkinTime: fmt(existing?.checkin_time), checkoutTime: fmt(existing?.checkout_time) });
  } catch (err) { return res.status(500).json({ success: false, message: 'Server error: ' + err.message }); }
}