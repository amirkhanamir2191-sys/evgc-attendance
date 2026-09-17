import { useState, useEffect, useCallback } from 'react';

const BATCHES = ['all','Batch 1','Batch 2','Batch 3','Batch 4','Batch 5'];

export default function Admin() {
  const [tab, setTab] = useState('attendance');
  const [attendance, setAttendance] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [batch, setBatch] = useState('all');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [editA, setEditA] = useState(null);
  const [editP, setEditP] = useState(null);
  const [showAddP, setShowAddP] = useState(false);
  const [newP, setNewP] = useState({evgc_id:'',name:'',district:'',zone:'',post_type:'',school_id:'',school_name:'',batch:'Batch 1',scheduled_date:'15th September 2026',date_iso:'2026-09-15'});

  const notify = (m, type='success') => { setMsg(m); setMsgType(type); setTimeout(() => setMsg(''), 3000); };

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (batch !== 'all') p.set('batch', batch);
    if (date) p.set('date', date);
    if (search) p.set('search', search);
    const r = await fetch('/api/admin/attendance?' + p);
    const d = await r.json();
    setAttendance(d.data || []);
    setLoading(false);
  }, [batch, date, search]);

  const loadParticipants = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (batch !== 'all') p.set('batch', batch);
    if (search) p.set('search', search);
    const r = await fetch('/api/admin/participants?' + p);
    const d = await r.json();
    setParticipants(d.data || []);
    setLoading(false);
  }, [batch, search]);

  useEffect(() => {
    if (tab === 'attendance') loadAttendance();
    else loadParticipants();
  }, [tab, batch, date, search]);

  const fmt = (t) => t ? new Date(t).toLocaleString('en-IN', {timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';

  const exportCSV = () => {
    const rows = tab === 'attendance' ? attendance : participants;
    if (!rows.length) return;
    const keys = Object.keys(rows[0]).filter(k => k !== 'id' && k !== 'created_at');
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = tab + '_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
  };

  // --- Attendance actions ---
  const deleteAttendance = async (id) => {
    if (!confirm('Delete this record permanently?')) return;
    await fetch('/api/admin/attendance?id=' + id, { method: 'DELETE' });
    notify('Record deleted'); loadAttendance();
  };

  const markCheckout = async (row) => {
    const now = new Date().toISOString();
    await fetch('/api/admin/attendance', { method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id: row.id, checkout_time: now, checkout_distance_m: 0 }) });
    notify('Check-out marked for ' + row.name); loadAttendance();
  };

  const unmarkCheckin = async (row) => {
    if (!confirm('This will remove the check-in time for ' + row.name + '. Continue?')) return;
    await fetch('/api/admin/attendance', { method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id: row.id, checkin_time: null, checkin_distance_m: null }) });
    notify('Check-in unmarked for ' + row.name); loadAttendance();
  };

  const unmarkCheckout = async (row) => {
    if (!confirm('Remove check-out for ' + row.name + '?')) return;
    await fetch('/api/admin/attendance', { method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id: row.id, checkout_time: null, checkout_distance_m: null }) });
    notify('Check-out unmarked for ' + row.name); loadAttendance();
  };

  const saveEditAttendance = async () => {
    const { id, ...updates } = editA;
    await fetch('/api/admin/attendance', { method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id, ...updates }) });
    setEditA(null); notify('Attendance record updated'); loadAttendance();
  };

  // --- Participant actions ---
  const deleteParticipant = async (id) => {
    if (!confirm('Delete this participant?')) return;
    await fetch('/api/admin/participants?id=' + id, { method: 'DELETE' });
    notify('Participant deleted'); loadParticipants();
  };

  const saveEditParticipant = async () => {
    await fetch('/api/admin/participants', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(editP) });
    setEditP(null); notify('Participant updated'); loadParticipants();
  };

  const addParticipant = async () => {
    await fetch('/api/admin/participants', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(newP) });
    setShowAddP(false); notify('Participant added'); loadParticipants();
  };

  const batchDateMap = { 'Batch 1':['15th September 2026','2026-09-15'], 'Batch 2':['16th September 2026','2026-09-16'], 'Batch 3':['17th September 2026','2026-09-17'], 'Batch 4':['18th September 2026','2026-09-18'], 'Batch 5':['19th September 2026','2026-09-19'] };

  const checkedIn = attendance.filter(a => a.checkin_time).length;
  const checkedOut = attendance.filter(a => a.checkout_time).length;
  const pending = checkedIn - checkedOut;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>EVGC Attendance — Admin Dashboard</h1>
          <p style={S.sub}>Vidya Samiksha Auditorium · Cycle 1 · 15–19 Sept 2026</p>
        </div>
        <a href="/" style={S.backBtn}>← Check-in Page</a>
      </div>

      {/* Stats */}
      {tab === 'attendance' && (
        <div style={S.statsRow}>
          {[['Total Records', attendance.length, '#1e293b'],['Checked In', checkedIn, '#128a3e'],['Checked Out', checkedOut, '#7c3aed'],['Pending Checkout', pending, '#d97706']].map(([label,val,color]) => (
            <div key={label} style={S.statCard}>
              <div style={{...S.statNum, color}}>{val}</div>
              <div style={S.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Notification */}
      {msg && <div style={{...S.msgBar, background: msgType==='success'?'#d1fae5':'#fee2e2', color: msgType==='success'?'#065f46':'#991b1b'}}>{msg}</div>}

      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={S.tabs}>
          {[['attendance','Attendance'],['participants','Master List']].map(([t,label]) => (
            <button key={t} style={{...S.tabBtn,...(tab===t?S.tabActive:{})}} onClick={() => { setTab(t); setSearch(''); setBatch('all'); }}>{label}</button>
          ))}
        </div>
        <div style={S.filters}>
          <select style={S.select} value={batch} onChange={e => setBatch(e.target.value)}>
            {BATCHES.map(b => <option key={b} value={b}>{b==='all'?'All Batches':b}</option>)}
          </select>
          {tab === 'attendance' && (
            <input type="date" style={S.select} value={date} onChange={e => setDate(e.target.value)} />
          )}
          <input style={S.searchInput} placeholder="Search name / ID / school..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={S.exportBtn} onClick={exportCSV}>⬇ Export CSV</button>
          {tab === 'participants' && <button style={S.addBtn} onClick={() => setShowAddP(true)}>+ Add Participant</button>}
        </div>
      </div>

      {loading ? <div style={S.loading}>Loading...</div> : (<>

        {/* ATTENDANCE TABLE */}
        {tab === 'attendance' && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead><tr style={S.thead}>
                {['Name','EVGC ID','School','District','Batch','Check-in','Check-out','Dist','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.id} style={S.tr}>
                    <td style={S.td}><strong>{a.name}</strong></td>
                    <td style={S.td}>{a.evgc_id||'—'}</td>
                    <td style={{...S.td, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis'}}>{a.school_name}</td>
                    <td style={S.td}>{a.district}</td>
                    <td style={S.td}>{a.batch}</td>
                    <td style={S.td}>
                      <span style={{color: a.checkin_time ? '#128a3e':'#999'}}>{fmt(a.checkin_time)}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{color: a.checkout_time ? '#7c3aed':'#999'}}>{fmt(a.checkout_time)}</span>
                    </td>
                    <td style={S.td}>{a.checkin_distance_m!=null ? a.checkin_distance_m+'m' : '—'}</td>
                    <td style={{...S.td, whiteSpace:'nowrap'}}>
                      <button style={S.editBtn} onClick={() => setEditA({...a})}>✏️ Edit</button>
                      {a.checkin_time && !a.checkout_time && (
                        <button style={S.checkoutBtn} onClick={() => markCheckout(a)}>✓ Checkout</button>
                      )}
                      {a.checkin_time && (
                        <button style={S.unmarkBtn} onClick={() => unmarkCheckin(a)}>✗ In</button>
                      )}
                      {a.checkout_time && (
                        <button style={S.unmarkBtn} onClick={() => unmarkCheckout(a)}>✗ Out</button>
                      )}
                      <button style={S.delBtn} onClick={() => deleteAttendance(a.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
                {!attendance.length && <tr><td colSpan={9} style={S.empty}>No records found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* PARTICIPANTS TABLE */}
        {tab === 'participants' && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead><tr style={S.thead}>
                {['Name','EVGC ID','School ID','School','District','Zone','Batch','Post Type','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id} style={S.tr}>
                    <td style={S.td}><strong>{p.name}</strong></td>
                    <td style={S.td}>{p.evgc_id||'—'}</td>
                    <td style={S.td}>{p.school_id||'—'}</td>
                    <td style={{...S.td, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis'}}>{p.school_name}</td>
                    <td style={S.td}>{p.district}</td>
                    <td style={S.td}>{p.zone}</td>
                    <td style={S.td}>{p.batch}</td>
                    <td style={S.td}>{p.post_type}</td>
                    <td style={{...S.td, whiteSpace:'nowrap'}}>
                      <button style={S.editBtn} onClick={() => setEditP({...p})}>✏️ Edit</button>
                      <button style={S.delBtn} onClick={() => deleteParticipant(p.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
                {!participants.length && <tr><td colSpan={9} style={S.empty}>No records found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </>)}

      {/* EDIT ATTENDANCE MODAL */}
      {editA && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <h2 style={S.modalTitle}>Edit Attendance Record</h2>
            <p style={{fontSize:13, color:'#666', margin:'0 0 16px'}}>Editing: <strong>{editA.name}</strong></p>
            <div style={S.grid2}>
              {[['name','Name'],['evgc_id','EVGC ID'],['school_id','School ID'],['school_name','School Name'],['district','District'],['zone','Zone'],['batch','Batch']].map(([f,label]) => (
                <div key={f} style={S.formRow}>
                  <label style={S.label}>{label}</label>
                  <input style={S.formInput} value={editA[f]||''} onChange={e => setEditA(p => ({...p,[f]:e.target.value}))} />
                </div>
              ))}
              <div style={S.formRow}>
                <label style={S.label}>Check-in Time (IST)</label>
                <input type="datetime-local" style={S.formInput} value={editA.checkin_time ? new Date(new Date(editA.checkin_time).getTime() + 5.5*3600000).toISOString().slice(0,16) : ''} onChange={e => setEditA(p => ({...p, checkin_time: e.target.value ? new Date(new Date(e.target.value).getTime() - 5.5*3600000).toISOString() : null}))} />
              </div>
              <div style={S.formRow}>
                <label style={S.label}>Check-out Time (IST)</label>
                <input type="datetime-local" style={S.formInput} value={editA.checkout_time ? new Date(new Date(editA.checkout_time).getTime() + 5.5*3600000).toISOString().slice(0,16) : ''} onChange={e => setEditA(p => ({...p, checkout_time: e.target.value ? new Date(new Date(e.target.value).getTime() - 5.5*3600000).toISOString() : null}))} />
              </div>
            </div>
            <div style={S.infoBox}>
              <strong>Quick actions in this modal:</strong> Clear the Check-in or Check-out time field and save to unmark it. Set a specific time to correct it.
            </div>
            <div style={S.modalBtns}>
              <button style={S.saveBtn} onClick={saveEditAttendance}>Save Changes</button>
              <button style={S.cancelBtn} onClick={() => setEditA(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PARTICIPANT MODAL */}
      {editP && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <h2 style={S.modalTitle}>Edit Participant</h2>
            <div style={S.grid2}>
              {[['name','Name'],['evgc_id','EVGC ID'],['school_id','School ID'],['school_name','School Name'],['district','District'],['zone','Zone'],['post_type','Post Type']].map(([f,label]) => (
                <div key={f} style={S.formRow}>
                  <label style={S.label}>{label}</label>
                  <input style={S.formInput} value={editP[f]||''} onChange={e => setEditP(p => ({...p,[f]:e.target.value}))} />
                </div>
              ))}
              <div style={S.formRow}>
                <label style={S.label}>Batch</label>
                <select style={S.formInput} value={editP.batch} onChange={e => { const [sd,di] = batchDateMap[e.target.value]; setEditP(p => ({...p, batch:e.target.value, scheduled_date:sd, date_iso:di})); }}>
                  {['Batch 1','Batch 2','Batch 3','Batch 4','Batch 5'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={S.modalBtns}>
              <button style={S.saveBtn} onClick={saveEditParticipant}>Save Changes</button>
              <button style={S.cancelBtn} onClick={() => setEditP(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PARTICIPANT MODAL */}
      {showAddP && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <h2 style={S.modalTitle}>Add New Participant</h2>
            <div style={S.grid2}>
              {[['name','Name *'],['evgc_id','EVGC ID'],['school_id','School ID'],['school_name','School Name'],['district','District'],['zone','Zone'],['post_type','Post Type']].map(([f,label]) => (
                <div key={f} style={S.formRow}>
                  <label style={S.label}>{label}</label>
                  <input style={S.formInput} value={newP[f]||''} onChange={e => setNewP(p => ({...p,[f]:e.target.value}))} />
                </div>
              ))}
              <div style={S.formRow}>
                <label style={S.label}>Batch</label>
                <select style={S.formInput} value={newP.batch} onChange={e => { const [sd,di] = batchDateMap[e.target.value]; setNewP(p => ({...p, batch:e.target.value, scheduled_date:sd, date_iso:di})); }}>
                  {['Batch 1','Batch 2','Batch 3','Batch 4','Batch 5'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={S.modalBtns}>
              <button style={S.saveBtn} onClick={addParticipant}>Add Participant</button>
              <button style={S.cancelBtn} onClick={() => setShowAddP(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page: { minHeight:'100vh', background:'#f0f2f5', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', paddingBottom:40 },
  header: { background:'#1e293b', padding:'20px 32px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  h1: { color:'#fff', margin:0, fontSize:20 },
  sub: { color:'#94a3b8', margin:'4px 0 0', fontSize:13 },
  backBtn: { background:'#2563eb', color:'#fff', padding:'8px 16px', borderRadius:8, textDecoration:'none', fontSize:14 },
  statsRow: { display:'flex', gap:16, padding:'20px 32px', flexWrap:'wrap' },
  statCard: { background:'#fff', borderRadius:12, padding:'16px 24px', flex:1, minWidth:130, boxShadow:'0 1px 4px rgba(0,0,0,0.08)', textAlign:'center' },
  statNum: { fontSize:32, fontWeight:700 },
  statLabel: { fontSize:12, color:'#666', marginTop:4 },
  msgBar: { margin:'0 32px 12px', padding:'10px 16px', borderRadius:8, fontSize:14, fontWeight:600 },
  toolbar: { padding:'0 32px 16px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', justifyContent:'space-between' },
  tabs: { display:'flex', gap:8 },
  tabBtn: { padding:'8px 20px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontSize:14, fontWeight:600, color:'#555' },
  tabActive: { background:'#2563eb', color:'#fff', border:'1px solid #2563eb' },
  filters: { display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' },
  select: { padding:'8px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:14, background:'#fff' },
  searchInput: { padding:'8px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:14, width:220 },
  exportBtn: { padding:'8px 16px', borderRadius:8, border:'none', background:'#128a3e', color:'#fff', fontSize:14, cursor:'pointer', fontWeight:600 },
  addBtn: { padding:'8px 16px', borderRadius:8, border:'none', background:'#7c3aed', color:'#fff', fontSize:14, cursor:'pointer', fontWeight:600 },
  loading: { textAlign:'center', padding:40, color:'#666', fontSize:16 },
  tableWrap: { margin:'0 32px', overflowX:'auto', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.08)' },
  table: { width:'100%', borderCollapse:'collapse', background:'#fff', fontSize:13 },
  thead: { background:'#f8fafc' },
  th: { padding:'12px 14px', textAlign:'left', fontWeight:600, color:'#475569', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' },
  tr: { borderBottom:'1px solid #f1f5f9' },
  td: { padding:'10px 14px', color:'#334155' },
  empty: { padding:40, textAlign:'center', color:'#94a3b8', fontSize:15 },
  editBtn: { padding:'3px 8px', background:'#dbeafe', color:'#1d4ed8', border:'none', borderRadius:5, cursor:'pointer', fontSize:11, marginRight:3 },
  checkoutBtn: { padding:'3px 8px', background:'#d1fae5', color:'#065f46', border:'none', borderRadius:5, cursor:'pointer', fontSize:11, marginRight:3 },
  unmarkBtn: { padding:'3px 8px', background:'#fef3c7', color:'#92400e', border:'none', borderRadius:5, cursor:'pointer', fontSize:11, marginRight:3 },
  delBtn: { padding:'3px 8px', background:'#fee2e2', color:'#b91c1c', border:'none', borderRadius:5, cursor:'pointer', fontSize:11 },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 },
  modalBox: { background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto' },
  modalTitle: { margin:'0 0 4px', fontSize:18, color:'#1e293b' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  formRow: { marginBottom:4 },
  label: { display:'block', fontSize:11, color:'#666', marginBottom:3, fontWeight:600, textTransform:'uppercase' },
  formInput: { width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid #e2e8f0', fontSize:13, boxSizing:'border-box' },
  infoBox: { background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#0369a1', margin:'12px 0' },
  modalBtns: { display:'flex', gap:8, marginTop:16 },
  saveBtn: { flex:1, padding:12, background:'#2563eb', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:15 },
  cancelBtn: { flex:1, padding:12, background:'#f1f5f9', color:'#555', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:15 },
};