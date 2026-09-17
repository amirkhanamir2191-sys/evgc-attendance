import { supabase, supabaseAdmin } from '../../../lib/supabase';

function isAuth(req) {
  return (req.headers.cookie||'').split(';').some(c=>c.trim()==='admin_auth=1');
}

export default async function handler(req, res) {
  if (!isAuth(req)) return res.status(401).json({ success:false, message:'Unauthorized' });

  if (req.method === 'GET') {
    const { search, batch } = req.query;
    let query = supabase.from('participants').select('*').order('batch').order('name');
    if (batch && batch !== 'all') query = query.eq('batch', batch);
    if (search) query = query.or('name.ilike.%'+search+'%,evgc_id.ilike.%'+search+'%,school_id.ilike.%'+search+'%');
    const { data, error } = await query;
    if (error) return res.status(500).json({ success:false, message:error.message });
    return res.json({ success:true, data });
  }
  if (req.method === 'POST') {
    const { evgc_id,name,district,zone,post_type,school_id,school_name,batch,scheduled_date,date_iso } = req.body;
    const { data, error } = await supabaseAdmin.from('participants').insert([{evgc_id,name,district,zone,post_type,school_id,school_name,batch,scheduled_date,date_iso}]).select();
    if (error) return res.status(500).json({ success:false, message:error.message });
    return res.json({ success:true, data:data[0] });
  }
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    const { error } = await supabaseAdmin.from('participants').update(updates).eq('id', id);
    if (error) return res.status(500).json({ success:false, message:error.message });
    return res.json({ success:true });
  }
  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('participants').delete().eq('id', id);
    if (error) return res.status(500).json({ success:false, message:error.message });
    return res.json({ success:true });
  }
  return res.status(405).json({ success:false });
}