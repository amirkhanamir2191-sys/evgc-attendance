import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { batch, date, search } = req.query;
    let query = supabase.from('attendance').select('*').order('checkin_time', { ascending: false });
    if (batch && batch !== 'all') query = query.eq('batch', batch);
    if (date) query = query.gte('checkin_time', date + 'T00:00:00+05:30').lte('checkin_time', date + 'T23:59:59+05:30');
    if (search) query = query.or('name.ilike.%' + search + '%,evgc_id.ilike.%' + search + '%,school_id.ilike.%' + search + '%,school_name.ilike.%' + search + '%');
    const { data, error } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, data });
  }
  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}