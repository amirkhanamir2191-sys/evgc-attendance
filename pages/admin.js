import { useState, useEffect, useCallback } from 'react';

const BATCHES = ['all', 'Batch 1', 'Batch 2', 'Batch 3', 'Batch 4', 'Batch 5'];
const BATCH_DATES = { 'Batch 1': '2026-09-15', 'Batch 2': '2026-09-16', 'Batch 3': '2026-09-17', 'Batch 4': '2026-09-18', 'Batch 5': '2026-09-19' };

export default function Admin() {
  const [tab, setTab] = useState('attendance');
  const [attendance, setAttendance] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [batch, setBatch] = useState('all');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [editP, setEditP] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newP, setNewP] = useState({ evgc_id:'', name:'', district:'', zone:'', post_type:'', school_id:'', school_name:'', batch:'Batch 1', scheduled_date:'15th September 2026', date_iso:'2026-09-15' });

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (batch !== 'all') params.set('batch', batch);
    if (date) params.set('date', date);
    if (search) params.set('search', search);
    const r = await fetch('/api/admin/attendance?' + params);
    const d = await r.json();
    setAttendance(d.data || []);
    setLoading(false);
  }, [batch, date, search]);

  const loadParticipants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (batch !== 'all') params.set('batch', batch);
    if (search) params.set('search', search);
    const r = await fetch('/api/admin/participants?' + params);
    const d = await r.json();
    setParticipants(d.data || []);
    setLoading(false);
  }, [batch, search]);

  useEffect(() => { if (tab === 'attendance') loadAttendance(); else loadParticipants(); }, [tab, batch, date, search]);

  const fmt = (t) => t ? new Date(t).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';

  const exportCSV = () => {
    const rows = tab === 'attendance' ? attendance : participants;
    if (!rows.length) return;
    const keys = Object.keys(rows[0]).filter(k => k !== 'id' && k !== 'created_at');
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = tab + '_export.csv';
    a.click();
  };

  const deleteAttendance = async (id) => {
    if (!confirm('Delete this attendance record?')) return;
    await fetch('/api/admin/attendance?id=' + id, { method: 'DELETE' });
    setMsg('Deleted'); loadAttendance();
  };

  const deleteParticipant = async (id) => {
    if (!confirm('Delete this participant?')) return;
    await fetch('/api/admin/participants?id=' + id, { method: 'DELETE' });
    setMsg('Deleted'); loadParticipants();
  };

  const saveEdit = async () => {
    await fetch('/api/admin/participants', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editP) });
    setEditP(null); setMsg('Saved'); loadParticipants();
  };

  const addParticipant = async () => {
    await fetch('/api/admin/participants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newP) });
    setShowAdd(false); setMsg('Added'); loadParticipants();
  };

  const checkedIn = attendance.filter(a => a.checkin_time).length;
  const checkedOut = attendance.filter(a => a.checkout_time).length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>EVGC Attendance Dashboard</h1>
          <p style={S.sub}>Vidya Samiksha Auditorium — Admin Panel</p>
        </div>
        <a href="/" style={S.backBtn}>Check-in Page</a>
      </div>

      {tab === 'attendance' && (
        <div style={S.statsRow}>
          {[['Total Records', attendance.length, '#2563eb'], ['Checked In', checkedIn, '#128a3e'], ['Checked Out', checkedOut, '#7c3aed'], ['Pending Checkout', checkedIn - checkedOut, '#d97706']].map(([label, val, color]) => (
            <div key={label} style={S.statCard}>
              <div style={{ ...S.statNum, color }}>{val}</div>
              <div style={S.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={S.toolbar}>
        <div style={S.tabs}>
          {['attendance', 'participants'].map(t => (
            <button key={t} style={{ ...S.tabBtn, ...(tab === t ? S.tabActive : {}) }} onClick={() => { setTab(t); setSearch(''); }}>{t === 'attendance' ? 'Attendance' : 'Master List'}</button>
          ))}
        </div>
        <div style={S.filters}>
          <select style={S.select} value={batch} onChange={e => setBatch(e.target.value)}>
            {BATCHES.map(b => <option key={b} value={b}>{b === 'all' ? 'All Batches' : b}</option>)}
          </select>
          {tab === 'attendance' && (
            <input type="date" style={S.select} value={date} onChange={e => setDate(e.target.value)} />
          )}
          <input style={S.searchInput} placeholder="Search name / ID / school..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={S.exportBtn} onClick={exportCSV}>Export CSV</button>
          {tab === 'participants' && <button style={S.addBtn} onClick={() => setShowAdd(true)}>+ Add</button>}
        </div>
      </div>

      {msg && <div style={S.msgBar}>{msg} <button onClick={() => setMsg('')} style={S.msgClose}>×</button></div>}

      {loading ? <div style={S.loading}>Loading...</div> : (
        <>
          {tab === 'attendance' && (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead><tr style={S.thead}>
                  {['Name','EVGC ID','School','District','Batch','Check-in','Check-out','Dist (m)',''].map(h => <th key={h} style={S.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {attendance.map(a => (
                    <tr key={a.id} style={S.tr}>
                      <td style={S.td}>{a.name}</td>
                      <td style={S.td}>{a.evgc_id || '—'}</td>
                      <td style={S.td}>{a.school_name}</td>
                      <td style={S.td}>{a.district}</td>
                      <td style={S.td}>{a.batch}</td>
                      <td style={S.td}>{fmt(a.checkin_time)}</td>
                      <td style={S.td}>{fmt(a.checkout_time)}</td>
                      <td style={S.td}>{a.checkin_distance_m}m</td>
                      <td style={S.td}><button style={S.delBtn} onClick={() => deleteAttendance(a.id)}>Delete</button></td>
                    </tr>
                  ))}
                  {!attendance.length && <tr><td colSpan={9} style={S.empty}>No records found</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'participants' && (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead><tr style={S.thead}>
                  {['Name','EVGC ID','School ID','School','District','Zone','Batch','Post Type',''].map(h => <th key={h} style={S.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {participants.map(p => (
                    <tr key={p.id} style={S.tr}>
                      <td style={S.td}>{p.name}</td>
                      <td style={S.td}>{p.evgc_id || '—'}</td>
                      <td style={S.td}>{p.school_id || '—'}</td>
                      <td style={S.td}>{p.school_name}</td>
                      <td style={S.td}>{p.district}</td>
                      <td style={S.td}>{p.zone}</td>
                      <td style={S.td}>{p.batch}</td>
                      <td style={S.td}>{p.post_type}</td>
                      <td style={S.td}>
                        <button style={S.editBtn} onClick={() => setEditP({...p})}>Edit</button>
                        <button style={S.delBtn} onClick={() => deleteParticipant(p.id)}>Del</button>
                      </td>
                    </tr>
                  ))}
                  {!participants.length && <tr><td colSpan={9} style={S.empty}>No records found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editP && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <h2 style={S.modalTitle}>Edit Participant</h2>
            {['name','evgc_id','school_id','school_name','district','zone','post_type'].map(f => (
              <div key={f} style={S.formRow}>
                <label style={S.label}>{f.replace(/_/g,' ').toUpperCase()}</label>
                <input style={S.formInput} value={editP[f] || ''} onChange={e => setEditP(prev => ({...prev, [f]: e.target.value}))} />
              </div>
            ))}
            <select style={{...S.formInput, marginBottom: 12}} value={editP.batch} onChange={e => setEditP(prev => ({...prev, batch: e.target.value, scheduled_date: e.target.value.replace('Batch 1','15th September 2026').replace('Batch 2','16th September 2026').replace('Batch 3','17th September 2026').replace('Batch 4','18th September 2026').replace('Batch 5','19th September 2026'), date_iso: e.target.value.replace('Batch 1','2026-09-15').replace('Batch 2','2026-09-16').replace('Batch 3','2026-09-17').replace('Batch 4','2026-09-18').replace('Batch 5','2026-09-19')}))}>
              {['Batch 1','Batch 2','Batch 3','Batch 4','Batch 5'].map(b => <option key={b}>{b}</option>)}
            </select>
            <div style={S.modalBtns}>
              <button style={S.saveBtn} onClick={saveEdit}>Save</button>
              <button style={S.cancelBtn} onClick={() => setEditP(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <h2 style={S.modalTitle}>Add Participant</h2>
            {['name','evgc_id','school_id','school_name','district','zone','post_type'].map(f => (
              <div key={f} style={S.formRow}>
                <label style={S.label}>{f.replace(/_/g,' ').toUpperCase()}</label>
                <input style={S.formInput} value={newP[f] || ''} onChange={e => setNewP(prev => ({...prev, [f]: e.target.value}))} />
              </div>
            ))}
            <select style={{...S.formInput, marginBottom:12}} value={newP.batch} onChange={e => setNewP(prev => ({...prev, batch: e.target.value, scheduled_date: e.target.value.replace('Batch 1','15th September 2026').replace('Batch 2','16th September 2026').replace('Batch 3','17th September 2026').replace('Batch 4','18th September 2026').replace('Batch 5','19th September 2026'), date_iso: e.target.value.replace('Batch 1','2026-09-15').replace('Batch 2','2026-09-16').replace('Batch 3','2026-09-17').replace('Batch 4','2026-09-18').replace('Batch 5','2026-09-19')}))}>
              {['Batch 1','Batch 2','Batch 3','Batch 4','Batch 5'].map(b => <option key={b}>{b}</option>)}
            </select>
            <div style={S.modalBtns}>
              <button style={S.saveBtn} onClick={addParticipant}>Add</button>
              <button style={S.cancelBtn} onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page: { minHeight:'100vh', background:'#f0f2f5', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', padding:'0 0 40px' },
  header: { background:'#1e293b', padding:'20px 32px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  h1: { color:'#fff', margin:0, fontSize:20 },
  sub: { color:'#94a3b8', margin:'4px 0 0', fontSize:13 },
  backBtn: { background:'#2563eb', color:'#fff', padding:'8px 16px', borderRadius:8, textDecoration:'none', fontSize:14 },
  statsRow: { display:'flex', gap:16, padding:'20px 32px', flexWrap:'wrap' },
  statCard: { background:'#fff', borderRadius:12, padding:'16px 24px', flex:1, minWidth:140, boxShadow:'0 1px 4px rgba(0,0,0,0.08)', textAlign:'center' },
  statNum: { fontSize:32, fontWeight:700 },
  statLabel: { fontSize:13, color:'#666', marginTop:4 },
  toolbar: { padding:'0 32px 16px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', justifyContent:'space-between' },
  tabs: { display:'flex', gap:8 },
  tabBtn: { padding:'8px 20px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontSize:14, fontWeight:600, color:'#555' },
  tabActive: { background:'#2563eb', color:'#fff', border:'1px solid #2563eb' },
  filters: { display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' },
  select: { padding:'8px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:14, background:'#fff' },
  searchInput: { padding:'8px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:14, width:220 },
  exportBtn: { padding:'8px 16px', borderRadius:8, border:'none', background:'#128a3e', color:'#fff', fontSize:14, cursor:'pointer', fontWeight:600 },
  addBtn: { padding:'8px 16px', borderRadius:8, border:'none', background:'#7c3aed', color:'#fff', fontSize:14, cursor:'pointer', fontWeight:600 },
  msgBar: { margin:'0 32px 12px', padding:'10px 16px', background:'#d1fae5', borderRadius:8, color:'#065f46', fontSize:14, display:'flex', justifyContent:'space-between' },
  msgClose: { background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#065f46' },
  loading: { textAlign:'center', padding:40, color:'#666' },
  tableWrap: { margin:'0 32px', overflowX:'auto', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.08)' },
  table: { width:'100%', borderCollapse:'collapse', background:'#fff', fontSize:13 },
  thead: { background:'#f8fafc' },
  th: { padding:'12px 14px', textAlign:'left', fontWeight:600, color:'#475569', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid #f1f5f9' },
  td: { padding:'10px 14px', color:'#334155', whiteSpace:'nowrap' },
  empty: { padding:40, textAlign:'center', color:'#94a3b8' },
  delBtn: { padding:'4px 10px', background:'#fee2e2', color:'#b91c1c', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, marginLeft:4 },
  editBtn: { padding:'4px 10px', background:'#dbeafe', color:'#1d4ed8', border:'none', borderRadius:6, cursor:'pointer', fontSize:12 },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modalBox: { background:'#fff', borderRadius:16, padding:28, width:'90%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' },
  modalTitle: { margin:'0 0 20px', fontSize:18, color:'#1e293b' },
  formRow: { marginBottom:12 },
  label: { display:'block', fontSize:12, color:'#666', marginBottom:4, fontWeight:600 },
  formInput: { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:14, boxSizing:'border-box' },
  modalBtns: { display:'flex', gap:8, marginTop:20 },
  saveBtn: { flex:1, padding:12, background:'#2563eb', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:15 },
  cancelBtn: { flex:1, padding:12, background:'#f1f5f9', color:'#555', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:15 },
};