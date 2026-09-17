import { useState, useRef } from 'react';

export default function Home() {
  const [step, setStep] = useState('entry');
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [participant, setParticipant] = useState(null);
  const [nextAction, setNextAction] = useState('checkin');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  function setMsg(msg, type) { setStatus(msg); setStatusType(type); }

  async function lookup() {
    if (!loginId.trim()) return setMsg('Please enter your Employee ID or School ID.', 'error');
    setLoading(true); setMsg('Looking up your record...', 'pending');
    try {
      const r = await fetch('/api/lookup?loginId=' + encodeURIComponent(loginId.trim()));
      const data = await r.json();
      if (!data.success) { setMsg(data.message, 'error'); return; }
      setParticipant(data); setNextAction(data.nextAction); setStep('verify'); setMsg('', '');
    } catch { setMsg('Could not reach the server. Check your internet connection.', 'error'); }
    finally { setLoading(false); }
  }

  async function confirm() {
    setLoading(true); setMsg('Fetching your location...', 'pending');
    if (!navigator.geolocation) { setMsg('Browser does not support location.', 'error'); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      setMsg('Verifying...', 'pending');
      try {
        const r = await fetch('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loginId: loginId.trim(), lat: pos.coords.latitude, lon: pos.coords.longitude, email: email.trim() || null }) });
        const data = await r.json();
        setParticipant(prev => ({ ...prev, ...data }));
        if (data.success) { setMsg(data.message, 'success'); setStep('done'); }
        else { setMsg(data.message, 'error'); }
      } catch { setMsg('Could not reach the server.', 'error'); }
      finally { setLoading(false); }
    }, () => { setMsg('Location denied. Please allow location access.', 'error'); setLoading(false); },
    { enableHighAccuracy: true, timeout: 15000 });
  }

  function startOver() {
    setStep('entry'); setLoginId(''); setEmail(''); setParticipant(null); setMsg('', '');
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  const actionLabel = nextAction === 'checkout' ? 'Confirm Check-Out' : 'Confirm Check-In';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🏛️</div>
        <h1 style={styles.h1}>Vidya Samiksha Auditorium</h1>
        <p style={styles.subtitle}>EVGC Training — Attendance</p>

        {step === 'entry' && (<>
          <input ref={inputRef} style={styles.input} type="text" placeholder="Employee ID or School ID"
            value={loginId} onChange={e => setLoginId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && lookup()} autoFocus autoComplete="off" />
          <button style={styles.btn} onClick={lookup} disabled={loading}>{loading ? 'Looking up...' : 'Continue'}</button>
        </>)}

        {(step === 'verify' || step === 'done') && participant && (<>
          <p style={styles.verifyPrompt}>{step === 'done' ? 'Attendance recorded' : 'Please verify your details:'}</p>
          <DetailsCard data={participant} />

          {step === 'verify' && nextAction !== 'wrongday' && nextAction !== 'complete' && (<>
            {nextAction === 'checkin' && (
              <div style={styles.emailBox}>
                <label style={styles.emailLabel}>Your Email ID <span style={{color:'#94a3b8'}}>(optional)</span></label>
                <input style={styles.emailInput} type="email" placeholder="yourname@gmail.com"
                  value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
            )}
            <button style={styles.btn} onClick={confirm} disabled={loading}>{loading ? 'Processing...' : actionLabel}</button>
          </>)}
          <button style={styles.btnSecondary} onClick={startOver}>{step === 'done' ? 'Done' : 'Not me - go back'}</button>
        </>)}

        {status && (<p style={{ ...styles.status, color: statusType === 'success' ? '#128a3e' : statusType === 'error' ? '#c0392b' : '#555' }}>{status}</p>)}
      </div>
    </div>
  );
}

function DetailsCard({ data }) {
  const rows = [
    ['Name', data.name], ['Employee ID', data.evgcId], ['School ID', data.schoolId],
    ['School', data.schoolName], ['District', data.district], ['Zone', data.zone],
    ['Batch', data.batch], ['Scheduled Date', data.scheduledDate],
    data.checkinTime && ['Checked in at', data.checkinTime],
    data.checkoutTime && ['Checked out at', data.checkoutTime],
    data.distance != null && ['Distance from venue', data.distance + ' m'],
  ].filter(Boolean);
  return (
    <div style={styles.detailsCard}>
      {rows.map(([label, value]) => value ? (
        <div key={label} style={styles.detailRow}>
          <span style={styles.detailLabel}>{label}</span>
          <span style={styles.detailValue}>{value}</span>
        </div>
      ) : null)}
    </div>
  );
}

const styles = {
  page: { minHeight:'100vh', background:'#f4f5f7', display:'flex', justifyContent:'center', alignItems:'flex-start', padding:'24px 16px', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' },
  card: { background:'#fff', borderRadius:16, boxShadow:'0 2px 12px rgba(0,0,0,0.08)', maxWidth:420, width:'100%', padding:'28px 24px', textAlign:'center' },
  logo: { fontSize:40, marginBottom:8 },
  h1: { fontSize:19, margin:'0 0 4px', color:'#1a1a1a' },
  subtitle: { fontSize:13, color:'#777', margin:'0 0 24px' },
  input: { width:'100%', padding:14, fontSize:16, border:'1px solid #ccc', borderRadius:10, marginBottom:14, textAlign:'center', letterSpacing:1, boxSizing:'border-box' },
  btn: { width:'100%', padding:14, fontSize:16, fontWeight:600, border:'none', borderRadius:10, background:'#2563eb', color:'#fff', cursor:'pointer', marginBottom:8 },
  btnSecondary: { width:'100%', padding:14, fontSize:16, fontWeight:600, border:'1px solid #ccc', borderRadius:10, background:'#fff', color:'#555', cursor:'pointer', marginBottom:8 },
  verifyPrompt: { fontSize:14, fontWeight:600, color:'#444', margin:'0 0 12px' },
  detailsCard: { background:'#f7f9fc', border:'1px solid #e2e8f0', borderRadius:12, padding:16, textAlign:'left', fontSize:14, marginBottom:16 },
  detailRow: { display:'flex', justifyContent:'space-between', gap:12, padding:'5px 0', borderBottom:'1px solid #ebeef2' },
  detailLabel: { color:'#888', flexShrink:0 },
  detailValue: { fontWeight:600, textAlign:'right' },
  emailBox: { background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 14px', marginBottom:12, textAlign:'left' },
  emailLabel: { display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 },
  emailInput: { width:'100%', padding:'10px 12px', fontSize:14, border:'1px solid #cbd5e1', borderRadius:8, boxSizing:'border-box' },
  status: { marginTop:14, fontSize:14, lineHeight:1.5, fontWeight:600 },
};