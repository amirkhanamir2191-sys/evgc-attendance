import { useState, useEffect, useCallback } from 'react';

const BATCHES = ['all','Batch 1','Batch 2','Batch 3','Batch 4','Batch 5'];
const batchDateMap = {
  1: {'Batch 1':['15th September 2026','2026-09-15'],'Batch 2':['16th September 2026','2026-09-16'],'Batch 3':['17th September 2026','2026-09-17'],'Batch 4':['18th September 2026','2026-09-18'],'Batch 5':['19th September 2026','2026-09-19']},
  2: {'Batch 1':['12th October 2026','2026-10-12'],'Batch 2':['13th October 2026','2026-10-13'],'Batch 3':['14th October 2026','2026-10-14'],'Batch 4':['15th October 2026','2026-10-15'],'Batch 5':['16th October 2026','2026-10-16']},
};
const cycleInfo = {
  1: { label: 'Cycle 1', dates: '15–19 Sep 2026', month: 'September 2026' },
  2: { label: 'Cycle 2', dates: '12–16 Oct 2026', month: 'October 2026' },
};

export default function Admin() {
  const [authed, setAuthed] = useState(null);
  const [cycleSelected, setCycleSelected] = useState(null); // null = not yet chosen
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState('attendance');
  const [attendance, setAttendance] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [batch, setBatch] = useState('all');
  const [cycle, setCycle] = useState(2);
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [editA, setEditA] = useState(null);
  const [editP, setEditP] = useState(null);
  const [showAddP, setShowAddP] = useState(false);
  const [newP, setNewP] = useState({evgc_id:'',name:'',district:'',zone:'',post_type:'',school_id:'',school_name:'',batch:'Batch 1',scheduled_date:'12th October 2026',date_iso:'2026-10-12'});

  // Check auth status on load
  useEffect(() => {
    fetch('/api/admin/attendance?cycle=${cycle}&batch=none').then(r => {
      if (r.status === 401) setAuthed(false);
      else setAuthed(true);
    }).catch(() => setAuthed(false));
  }, []);

  const login = async () => {
    setLoginLoading(true); setLoginErr('');
    const r = await fetch('/api/auth', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
    const d = await r.json();
    if (d.success) { setAuthed(true); setCycleSelected(null); }
    else { setLoginErr(d.message || 'Invalid credentials.'); }
    setLoginLoading(false);
  };

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setAuthed(false); setCycleSelected(null); setUsername(''); setPassword('');
  };

  const notify = (m, type='success') => { setMsg(m); setMsgType(type); setTimeout(() => setMsg(''), 3000); };

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set('cycle', cycle);
    if (batch !== 'all') p.set('batch', batch);
    if (date) p.set('date', date);
    if (search) p.set('search', search);
    const r = await fetch('/api/admin/attendance?' + p);
    if (r.status === 401) { setAuthed(false); return; }
    const d = await r.json();
    setAttendance(d.data || []); setLoading(false);
  }, [cycle, batch, date, search]);

  const loadParticipants = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set('cycle', cycle);
    if (batch !== 'all') p.set('batch', batch);
    if (search) p.set('search', search);
    const [pr, ar] = await Promise.all([
      fetch('/api/admin/participants?' + p),
      fetch('/api/admin/attendance?' + new URLSearchParams({ cycle, date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) })),
    ]);
    if (pr.status === 401) { setAuthed(false); return; }
    const pd = await pr.json();
    const ad = await ar.json();
    setParticipants(pd.data || []);
    setTodayAttendance(ad.data || []);
    setLoading(false);
  }, [cycle, batch, search]);

  useEffect(() => {
    if (!authed || !cycleSelected) return;
    if (tab === 'attendance') loadAttendance();
    else loadParticipants();
  }, [authed, cycleSelected, cycle, tab, batch, date, search]);

  const fmt = (t) => t ? new Date(t).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';

  const exportCSV = () => {
    const rows = tab === 'attendance' ? attendance : participants;
    if (!rows.length) return;
    const keys = Object.keys(rows[0]).filter(k => k !== 'created_at');
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k]??'')).join(','))].join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = tab + '_' + new Date().toISOString().slice(0,10) + '.csv'; a.click();
  };

  const deleteAttendance = async (id) => {
    if (!confirm('Delete this record?')) return;
    await fetch('/api/admin/attendance?id=' + id, { method: 'DELETE' });
    notify('Deleted'); loadAttendance();
  };
  const markCheckout = async (row) => {
    await fetch('/api/admin/attendance', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id:row.id, checkout_time: new Date().toISOString(), checkout_distance_m:0}) });
    notify('Check-out marked for ' + row.name); loadAttendance();
  };
  const unmarkCheckin = async (row) => {
    if (!confirm('Unmark check-in for ' + row.name + '?')) return;
    await fetch('/api/admin/attendance', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id:row.id, checkin_time:null, checkin_distance_m:null}) });
    notify('Check-in cleared'); loadAttendance();
  };
  const unmarkCheckout = async (row) => {
    if (!confirm('Unmark check-out for ' + row.name + '?')) return;
    await fetch('/api/admin/attendance', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id:row.id, checkout_time:null, checkout_distance_m:null}) });
    notify('Check-out cleared'); loadAttendance();
  };
  const saveEditAttendance = async () => {
    const {id,...updates} = editA;
    await fetch('/api/admin/attendance', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id,...updates}) });
    setEditA(null); notify('Updated'); loadAttendance();
  };
  const adminCheckin = async (p) => {
    if (!confirm('Check in ' + p.name + ' manually?')) return;
    const r = await fetch('/api/admin/attendance', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ evgc_id:p.evgc_id, school_id:p.school_id, name:p.name, district:p.district,
        zone:p.zone, school_name:p.school_name, batch:p.batch, email:null, cycle }) });
    const d = await r.json();
    if (d.success) notify('✅ Checked in: ' + p.name);
    else notify(d.message || 'Error', 'error');
    loadParticipants();
  };

  const adminCheckout = async (p) => {
    if (!confirm('Check out ' + p.name + ' manually?')) return;
    // Find today's attendance record for this participant
    const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const params = new URLSearchParams({ cycle, date: todayISO });
    if (p.evgc_id) params.set('search', p.evgc_id);
    else params.set('search', p.school_id || p.name);
    const r = await fetch('/api/admin/attendance?' + params);
    const d = await r.json();
    const rec = (d.data || []).find(a =>
      (p.evgc_id && a.evgc_id === p.evgc_id) ||
      (p.school_id && a.school_id === p.school_id)
    );
    if (!rec) { notify('No check-in record found for today', 'error'); return; }
    if (rec.checkout_time) { notify('Already checked out', 'error'); return; }
    await fetch('/api/admin/attendance', { method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: rec.id, checkout_time: new Date().toISOString(), checkout_distance_m: 0 }) });
    notify('✅ Checked out: ' + p.name);
    loadParticipants();
  };

  const deleteParticipant = async (id) => {
    if (!confirm('Delete participant?')) return;
    await fetch('/api/admin/participants?id=' + id, { method:'DELETE' });
    notify('Deleted'); loadParticipants();
  };
  const saveEditParticipant = async () => {
    await fetch('/api/admin/participants', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(editP) });
    setEditP(null); notify('Updated'); loadParticipants();
  };
  const addParticipant = async () => {
    if (!newP.name) return notify('Name is required','error');
    await fetch('/api/admin/participants', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...newP, cycle}) });
    setShowAddP(false); notify('Added'); loadParticipants();
  };

  const checkedIn = attendance.filter(a => a.checkin_time).length;
  const checkedOut = attendance.filter(a => a.checkout_time).length;

  // --- LOGIN SCREEN ---
  if (authed === false) return (
    <div style={{minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif'}}>
      <div style={{background:'#fff', borderRadius:20, padding:40, width:'100%', maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{textAlign:'center', marginBottom:28}}>
          <div style={{fontSize:48, marginBottom:8}}>🔐</div>
          <h1 style={{fontSize:20, margin:0, color:'#1e293b'}}>Admin Login</h1>
          <p style={{fontSize:13, color:'#64748b', margin:'6px 0 0'}}>EVGC Attendance Dashboard</p>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5}}>USERNAME</label>
          <input style={{width:'100%', padding:'11px 14px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:15, boxSizing:'border-box'}}
            value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key==='Enter' && login()}
            placeholder="Enter username" autoFocus />
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5}}>PASSWORD</label>
          <input type="password" style={{width:'100%', padding:'11px 14px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:15, boxSizing:'border-box'}}
            value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && login()}
            placeholder="Enter password" />
        </div>
        {loginErr && <div style={{background:'#fee2e2', color:'#b91c1c', borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:14, textAlign:'center'}}>{loginErr}</div>}
        <button style={{width:'100%', padding:13, background:'#2563eb', color:'#fff', border:'none', borderRadius:9, fontSize:16, fontWeight:700, cursor:'pointer'}}
          onClick={login} disabled={loginLoading}>{loginLoading ? 'Signing in...' : 'Sign In'}</button>
      </div>
    </div>
  );

  if (authed === null) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#666'}}>Loading...</div>;

  // --- CYCLE SELECTION SCREEN ---
  if (authed === true && !cycleSelected) return (
    <div style={{minHeight:'100vh', background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif'}}>
      <div style={{background:'#fff', borderRadius:24, padding:48, width:'100%', maxWidth:480, boxShadow:'0 24px 80px rgba(0,0,0,0.35)', textAlign:'center'}}>
        <div style={{fontSize:52, marginBottom:10}}>📋</div>
        <h1 style={{fontSize:22, margin:'0 0 6px', color:'#1e293b', fontWeight:800}}>EVGC Attendance</h1>
        <p style={{fontSize:14, color:'#64748b', margin:'0 0 36px'}}>Select a training cycle to continue</p>
        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          {[1, 2].map(c => (
            <button key={c} onClick={() => { setCycleSelected(c); setCycle(c); }} style={{
              padding:'20px 24px', borderRadius:14, border:'2px solid #e2e8f0',
              background:c===1?'#eff6ff':'#f0fdf4', cursor:'pointer', textAlign:'left',
              transition:'all .15s', display:'flex', alignItems:'center', gap:16,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c===1?'#2563eb':'#16a34a'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow='none'; }}>
              <div style={{fontSize:32}}>{c===1?'🗓️':'📅'}</div>
              <div>
                <div style={{fontSize:17, fontWeight:700, color:'#1e293b'}}>{cycleInfo[c].label}</div>
                <div style={{fontSize:13, color:'#64748b', marginTop:3}}>Vidya Samiksha Auditorium · {cycleInfo[c].dates}</div>
              </div>
              <div style={{marginLeft:'auto', fontSize:20, color:'#94a3b8'}}>→</div>
            </button>
          ))}
        </div>
        <button onClick={logout} style={{marginTop:24, background:'none', border:'none', color:'#94a3b8', fontSize:13, cursor:'pointer', textDecoration:'underline'}}>Logout</button>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>EVGC Attendance — Admin Dashboard</h1>
          <p style={S.sub}>Vidya Samiksha Auditorium · {cycleInfo[cycle].label} · {cycleInfo[cycle].dates}</p>
        </div>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <a href="/" style={S.backBtn}>← Check-in Page</a>
          <button onClick={() => setCycleSelected(null)} style={{...S.backBtn, background:'#7c3aed', cursor:'pointer', border:'none'}}>⇄ Cycles</button>
          <button onClick={logout} style={{...S.backBtn, background:'#ef4444', cursor:'pointer', border:'none'}}>Logout</button>
        </div>
      </div>

      {tab === 'attendance' && (
        <div style={S.statsRow}>
          {[['Total Records',attendance.length,'#1e293b'],['Checked In',checkedIn,'#128a3e'],['Checked Out',checkedOut,'#7c3aed'],['Pending Checkout',checkedIn-checkedOut,'#d97706']].map(([label,val,color]) => (
            <div key={label} style={S.statCard}>
              <div style={{...S.statNum,color}}>{val}</div>
              <div style={S.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {msg && <div style={{...S.msgBar, background:msgType==='success'?'#d1fae5':'#fee2e2', color:msgType==='success'?'#065f46':'#991b1b'}}>{msg}</div>}

      <div style={S.toolbar}>
        <div style={S.tabs}>
          {[['attendance','Attendance'],['participants','Master List']].map(([t,label]) => (
            <button key={t} style={{...S.tabBtn,...(tab===t?S.tabActive:{})}} onClick={() => {setTab(t);setSearch('');setBatch('all');}}>{label}</button>
          ))}
        </div>
        <div style={S.filters}>
          <select style={S.select} value={batch} onChange={e => setBatch(e.target.value)}>
            {BATCHES.map(b => <option key={b} value={b}>{b==='all'?'All Batches':b}</option>)}
          </select>
          {tab==='attendance' && <input type="date" style={S.select} value={date} onChange={e => setDate(e.target.value)} />}
          <input style={S.searchInput} placeholder="Search name / ID / school..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={S.exportBtn} onClick={exportCSV}>⬇ Export CSV</button>
          {tab==='participants' && <button style={S.addBtn} onClick={() => setShowAddP(true)}>+ Add</button>}
        </div>
      </div>

      {loading ? <div style={S.loading}>Loading...</div> : (<>
        {tab==='attendance' && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead><tr style={S.thead}>{['Name','EVGC ID','Email','School','District','Batch','Check-in','Check-out','Dist','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.id} style={S.tr}>
                    <td style={S.td}><strong>{a.name}</strong></td>
                    <td style={S.td}>{a.evgc_id||'—'}</td>
                    <td style={S.td}>{a.email||'—'}</td>
                    <td style={{...S.td,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis'}}>{a.school_name}</td>
                    <td style={S.td}>{a.district}</td>
                    <td style={S.td}>{a.batch}</td>
                    <td style={S.td}><span style={{color:a.checkin_time?'#128a3e':'#999'}}>{fmt(a.checkin_time)}</span></td>
                    <td style={S.td}><span style={{color:a.checkout_time?'#7c3aed':'#999'}}>{fmt(a.checkout_time)}</span></td>
                    <td style={S.td}>{a.checkin_distance_m!=null?a.checkin_distance_m+'m':'—'}</td>
                    <td style={{...S.td,whiteSpace:'nowrap'}}>
                      <button style={S.editBtn} onClick={()=>setEditA({...a})}>✏️</button>
                      {a.checkin_time&&!a.checkout_time&&<button style={S.checkoutBtn} onClick={()=>markCheckout(a)}>⏰ Out</button>}
                      {a.checkin_time&&<button style={S.unmarkBtn} onClick={()=>unmarkCheckin(a)}>⏰ In</button>}
                      {a.checkout_time&&<button style={S.unmarkBtn} onClick={()=>unmarkCheckout(a)}>⏰ Out</button>}
                      <button style={S.delBtn} onClick={()=>deleteAttendance(a.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
                {!attendance.length&&<tr><td colSpan={10} style={S.empty}>No records found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab==='participants' && (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead><tr style={S.thead}>{['Name','EVGC ID','School ID','School','District','Zone','Batch','Post Type','Today Status','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {participants.map(p => {
                  const rec = todayAttendance.find(a =>
                    (p.evgc_id && a.evgc_id === p.evgc_id) ||
                    (p.school_id && a.school_id === p.school_id)
                  );
                  const isIn = rec && rec.checkin_time;
                  const isOut = rec && rec.checkout_time;
                  return (
                    <tr key={p.id} style={{...S.tr, background: isOut ? '#f0fdf4' : isIn ? '#fffbeb' : 'inherit'}}>
                      <td style={S.td}><strong>{p.name}</strong></td>
                      <td style={S.td}>{p.evgc_id||'—'}</td>
                      <td style={S.td}>{p.school_id||'—'}</td>
                      <td style={{...S.td,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis'}}>{p.school_name}</td>
                      <td style={S.td}>{p.district}</td>
                      <td style={S.td}>{p.zone}</td>
                      <td style={S.td}>{p.batch}</td>
                      <td style={S.td}>{p.post_type}</td>
                      <td style={S.td}>
                        {isOut
                          ? <span style={{color:'#7c3aed',fontWeight:700}}>✅ In & Out</span>
                          : isIn
                          ? <span style={{color:'#128a3e',fontWeight:700}}>✅ Checked In</span>
                          : <span style={{color:'#999'}}>—</span>}
                        {isIn && <div style={{fontSize:11,color:'#888'}}>{fmt(rec.checkin_time)}{isOut ? ' → ' + fmt(rec.checkout_time) : ''}</div>}
                      </td>
                      <td style={{...S.td,whiteSpace:'nowrap'}}>
                        {!isIn && <button style={S.checkinBtn} onClick={()=>adminCheckin(p)}>✅ In</button>}
                        {isIn && !isOut && <button style={S.checkoutBtn} onClick={()=>adminCheckout(p)}>⏰ Out</button>}
                        <button style={S.editBtn} onClick={()=>setEditP({...p})}>✏</button>
                        <button style={S.delBtn} onClick={()=>deleteParticipant(p.id)}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
                {!participants.length&&<tr><td colSpan={10} style={S.empty}>No records found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </>)}

      {editA && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <h2 style={S.modalTitle}>Edit Attendance Record</h2>
            <p style={{fontSize:13,color:'#666',margin:'0 0 16px'}}>Editing: <strong>{editA.name}</strong></p>
            <div style={S.grid2}>
              {[['name','Name'],['evgc_id','EVGC ID'],['email','Email'],['school_id','School ID'],['school_name','School Name'],['district','District'],['zone','Zone'],['batch','Batch']].map(([f,label]) => (
                <div key={f} style={S.formRow}>
                  <label style={S.label}>{label}</label>
                  <input style={S.formInput} value={editA[f]||''} onChange={e=>setEditA(p=>({...p,[f]:e.target.value}))} />
                </div>
              ))}
              <div style={S.formRow}>
                <label style={S.label}>Check-in Time (IST)</label>
                <input type="datetime-local" style={S.formInput} value={editA.checkin_time?new Date(new Date(editA.checkin_time).getTime()+5.5*3600000).toISOString().slice(0,16):''} onChange={e=>setEditA(p=>({...p,checkin_time:e.target.value?new Date(new Date(e.target.value).getTime()-5.5*3600000).toISOString():null}))} />
              </div>
              <div style={S.formRow}>
                <label style={S.label}>Check-out Time (IST)</label>
                <input type="datetime-local" style={S.formInput} value={editA.checkout_time?new Date(new Date(editA.checkout_time).getTime()+5.5*3600000).toISOString().slice(0,16):''} onChange={e=>setEditA(p=>({...p,checkout_time:e.target.value?new Date(new Date(e.target.value).getTime()-5.5*3600000).toISOString():null}))} />
              </div>
            </div>
            <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#0369a1',margin:'12px 0'}}>
              Clear a time field and save to unmark check-in or check-out.
            </div>
            <div style={S.modalBtns}>
              <button style={S.saveBtn} onClick={saveEditAttendance}>Save Changes</button>
              <button style={S.cancelBtn} onClick={()=>setEditA(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editP && (() => {
        const editRec = todayAttendance.find(a =>
          (editP.evgc_id && a.evgc_id === editP.evgc_id) ||
          (editP.school_id && a.school_id === editP.school_id)
        );
        const editIsIn = editRec && editRec.checkin_time;
        const editIsOut = editRec && editRec.checkout_time;
        return (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <h2 style={S.modalTitle}>Edit Participant</h2>

            {/* Today's Attendance Status */}
            <div style={{background:editIsOut?'#f0fdf4':editIsIn?'#fffbeb':'#f8fafc',border:'1px solid '+(editIsOut?'#bbf7d0':editIsIn?'#fde68a':'#e2e8f0'),borderRadius:10,padding:'12px 16px',marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:'#475569',marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>Today's Attendance</div>
              <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <span style={{fontSize:14,fontWeight:600,color:editIsOut?'#7c3aed':editIsIn?'#128a3e':'#94a3b8'}}>
                  {editIsOut ? '✅ Checked In & Out' : editIsIn ? '✅ Checked In' : '— Not checked in'}
                </span>
                {editIsIn && <span style={{fontSize:12,color:'#666'}}>{fmt(editRec.checkin_time)}{editIsOut?' → '+fmt(editRec.checkout_time):''}</span>}
              </div>
              <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
                {!editIsIn && (
                  <button style={{...S.checkinBtn,padding:'6px 14px',fontSize:13}} onClick={async()=>{await adminCheckin(editP);setEditP(null);}}>
                    ✅ Check In Now
                  </button>
                )}
                {editIsIn && !editIsOut && (
                  <button style={{...S.checkoutBtn,padding:'6px 14px',fontSize:13}} onClick={async()=>{await adminCheckout(editP);setEditP(null);}}>
                    ⏰ Check Out Now
                  </button>
                )}
                {editIsIn && !editIsOut && (
                  <button style={{...S.checkinBtn,padding:'6px 14px',fontSize:13}} onClick={async()=>{await adminCheckin(editP);setEditP(null);}}>
                    ✅ Re-Check In
                  </button>
                )}
              </div>
            </div>

            <div style={S.grid2}>
              {[['name','Name'],['evgc_id','EVGC ID'],['school_id','School ID'],['school_name','School Name'],['district','District'],['zone','Zone'],['post_type','Post Type']].map(([f,label]) => (
                <div key={f} style={S.formRow}>
                  <label style={S.label}>{label}</label>
                  <input style={S.formInput} value={editP[f]||''} onChange={e=>setEditP(p=>({...p,[f]:e.target.value}))} />
                </div>
              ))}
              <div style={S.formRow}>
                <label style={S.label}>Batch</label>
                <select style={S.formInput} value={editP.batch} onChange={e=>{const[sd,di]=batchDateMap[cycle][e.target.value];setEditP(p=>({...p,batch:e.target.value,scheduled_date:sd,date_iso:di}));}}>
                  {['Batch 1','Batch 2','Batch 3','Batch 4','Batch 5'].map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={S.modalBtns}>
              <button style={S.saveBtn} onClick={saveEditParticipant}>Save Details</button>
              <button style={S.cancelBtn} onClick={()=>setEditP(null)}>Cancel</button>
            </div>
          </div>
        </div>
        );
      })()}

      {showAddP && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <h2 style={S.modalTitle}>Add New Participant</h2>
            <div style={S.grid2}>
              {[['name','Name *'],['evgc_id','EVGC ID'],['school_id','School ID'],['school_name','School Name'],['district','District'],['zone','Zone'],['post_type','Post Type']].map(([f,label]) => (
                <div key={f} style={S.formRow}>
                  <label style={S.label}>{label}</label>
                  <input style={S.formInput} value={newP[f]||''} onChange={e=>setNewP(p=>({...p,[f]:e.target.value}))} />
                </div>
              ))}
              <div style={S.formRow}>
                <label style={S.label}>Batch</label>
                <select style={S.formInput} value={newP.batch} onChange={e=>{const[sd,di]=batchDateMap[cycle][e.target.value];setNewP(p=>({...p,batch:e.target.value,scheduled_date:sd,date_iso:di}));}}>
                  {['Batch 1','Batch 2','Batch 3','Batch 4','Batch 5'].map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={S.modalBtns}>
              <button style={S.saveBtn} onClick={addParticipant}>Add</button>
              <button style={S.cancelBtn} onClick={()=>setShowAddP(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page:{minHeight:'100vh',background:'#f0f2f5',fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',paddingBottom:40},
  header:{background:'#1e293b',padding:'20px 32px',display:'flex',justifyContent:'space-between',alignItems:'center'},
  h1:{color:'#fff',margin:0,fontSize:20},
  sub:{color:'#94a3b8',margin:'4px 0 0',fontSize:13},
  backBtn:{background:'#2563eb',color:'#fff',padding:'8px 16px',borderRadius:8,textDecoration:'none',fontSize:14},
  statsRow:{display:'flex',gap:16,padding:'20px 32px',flexWrap:'wrap'},
  statCard:{background:'#fff',borderRadius:12,padding:'16px 24px',flex:1,minWidth:130,boxShadow:'0 1px 4px rgba(0,0,0,0.08)',textAlign:'center'},
  statNum:{fontSize:32,fontWeight:700},
  statLabel:{fontSize:12,color:'#666',marginTop:4},
  msgBar:{margin:'0 32px 12px',padding:'10px 16px',borderRadius:8,fontSize:14,fontWeight:600},
  toolbar:{padding:'0 32px 16px',display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'},
  tabs:{display:'flex',gap:8},
  tabBtn:{padding:'8px 20px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',fontSize:14,fontWeight:600,color:'#555'},
  tabActive:{background:'#2563eb',color:'#fff',border:'1px solid #2563eb'},
  filters:{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'},
  select:{padding:'8px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:14,background:'#fff'},
  searchInput:{padding:'8px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:14,width:220},
  exportBtn:{padding:'8px 16px',borderRadius:8,border:'none',background:'#128a3e',color:'#fff',fontSize:14,cursor:'pointer',fontWeight:600},
  addBtn:{padding:'8px 16px',borderRadius:8,border:'none',background:'#7c3aed',color:'#fff',fontSize:14,cursor:'pointer',fontWeight:600},
  loading:{textAlign:'center',padding:40,color:'#666',fontSize:16},
  tableWrap:{margin:'0 32px',overflowX:'auto',borderRadius:12,boxShadow:'0 1px 4px rgba(0,0,0,0.08)'},
  table:{width:'100%',borderCollapse:'collapse',background:'#fff',fontSize:13},
  thead:{background:'#f8fafc'},
  th:{padding:'12px 14px',textAlign:'left',fontWeight:600,color:'#475569',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'},
  tr:{borderBottom:'1px solid #f1f5f9'},
  td:{padding:'10px 14px',color:'#334155'},
  empty:{padding:40,textAlign:'center',color:'#94a3b8',fontSize:15},
  editBtn:{padding:'3px 8px',background:'#dbeafe',color:'#1d4ed8',border:'none',borderRadius:5,cursor:'pointer',fontSize:11,marginRight:3},
  checkinBtn:{padding:'3px 8px',background:'#d1fae5',color:'#065f46',border:'none',borderRadius:5,cursor:'pointer',fontSize:11,marginRight:3,fontWeight:700},
  checkoutBtn:{padding:'3px 8px',background:'#fef3c7',color:'#92400e',border:'none',borderRadius:5,cursor:'pointer',fontSize:11,marginRight:3,fontWeight:700},
  unmarkBtn:{padding:'3px 8px',background:'#fef3c7',color:'#92400e',border:'none',borderRadius:5,cursor:'pointer',fontSize:11,marginRight:3},
  delBtn:{padding:'3px 8px',background:'#fee2e2',color:'#b91c1c',border:'none',borderRadius:5,cursor:'pointer',fontSize:11},
  modal:{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16},
  modalBox:{background:'#fff',borderRadius:16,padding:28,width:'100%',maxWidth:580,maxHeight:'90vh',overflowY:'auto'},
  modalTitle:{margin:'0 0 16px',fontSize:18,color:'#1e293b'},
  grid2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12},
  formRow:{marginBottom:4},
  label:{display:'block',fontSize:11,color:'#666',marginBottom:3,fontWeight:600,textTransform:'uppercase'},
  formInput:{width:'100%',padding:'8px 10px',borderRadius:7,border:'1px solid #e2e8f0',fontSize:13,boxSizing:'border-box'},
  modalBtns:{display:'flex',gap:8,marginTop:16},
  saveBtn:{flex:1,padding:12,background:'#2563eb',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:15},
  cancelBtn:{flex:1,padding:12,background:'#f1f5f9',color:'#555',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:15},
};
