import { supabase, supabaseAdmin } from '../../lib/supabase';

const OFFICE_LAT = 28.6683203;
const OFFICE_LON = 77.2238452;
const RADIUS_METERS = 150;

function getDistanceMeters(lat1,lon1,lat2,lon2) {
  const R=6371000,dLat=((lat2-lat1)*Math.PI)/180,dLon=((lon2-lon1)*Math.PI)/180;
  const a=Math.sin(dLat/2)**2+Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success:false, message:'Method not allowed' });
  const { loginId, lat, lon, email } = req.body;
  if (!loginId) return res.status(400).json({ success:false, message:'Missing ID.' });
  if (lat==null||lon==null) return res.status(400).json({ success:false, message:'Location not received. Please allow location access.' });

  const distance = getDistanceMeters(parseFloat(lat),parseFloat(lon),OFFICE_LAT,OFFICE_LON);
  if (distance > RADIUS_METERS) return res.json({ success:false, message:'You are too far from the venue ('+Math.round(distance)+'m away). Must be within '+RADIUS_METERS+'m.' });

  try {
    const { data:byEvgc } = await supabase.from('participants').select('*').eq('evgc_id', loginId);
    const { data:bySchool } = await supabase.from('participants').select('*').eq('school_id', loginId);
    const seen=new Set();
    const matches=[...(byEvgc||[]),...(bySchool||[])].filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;});
    if (!matches.length) return res.json({ success:false, message:'ID not found.' });
    if (matches.length>1) return res.json({ success:false, message:'Multiple records. Use your School ID.' });
    const p=matches[0];
    const todayISO=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
    if (p.date_iso!==todayISO) return res.json({ success:false, message:p.name+', you are scheduled for '+p.batch+' ('+p.scheduled_date+'), not today.' });
    const fmt=(t)=>t?new Date(t).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'}):null;
    const details={name:p.name,evgcId:p.evgc_id,schoolId:p.school_id,schoolName:p.school_name,district:p.district,zone:p.zone,batch:p.batch,scheduledDate:p.scheduled_date,distance:Math.round(distance)};
    const orFilter=[p.evgc_id?'evgc_id.eq.'+p.evgc_id:null,p.school_id?'school_id.eq.'+p.school_id:null].filter(Boolean).join(',');
    const { data:existing } = await supabase.from('attendance').select('*').or(orFilter).gte('checkin_time',todayISO+'T00:00:00+05:30').lte('checkin_time',todayISO+'T23:59:59+05:30').maybeSingle();
    if (!existing) {
      const now=new Date().toISOString();
      const { error } = await supabaseAdmin.from('attendance').insert({evgc_id:p.evgc_id,school_id:p.school_id,name:p.name,district:p.district,zone:p.zone,school_name:p.school_name,batch:p.batch,checkin_time:now,checkin_distance_m:Math.round(distance),email:email||null});
      if (error) throw error;
      return res.json({ success:true, action:'checkin', message:'Checked in successfully!', checkinTime:fmt(now), ...details });
    }
    if (!existing.checkout_time) {
      const now=new Date().toISOString();
      const { error } = await supabaseAdmin.from('attendance').update({checkout_time:now,checkout_distance_m:Math.round(distance),email:email||existing.email||null}).eq('id',existing.id);
      if (error) throw error;
      return res.json({ success:true, action:'checkout', message:'Checked out successfully!', checkinTime:fmt(existing.checkin_time), checkoutTime:fmt(now), ...details });
    }
    return res.json({ success:false, action:'complete', message:p.name+', you have already checked in and checked out today.', checkinTime:fmt(existing.checkin_time), checkoutTime:fmt(existing.checkout_time), ...details });
  } catch(err) { return res.status(500).json({ success:false, message:'Server error: '+err.message }); }
}