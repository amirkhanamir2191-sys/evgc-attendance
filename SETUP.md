# EVGC Attendance System — Supabase + Next.js Setup

## Files in this package
- `scripts/setup_db.sql` — run once in Supabase to create tables
- `scripts/participants.json` — 503 participant records ready to import
- `scripts/import_participants.js` — Node script to load participants into Supabase
- `pages/index.js` — the check-in frontend
- `pages/api/lookup.js` — participant lookup API
- `pages/api/checkin.js` — attendance recording API
- `lib/supabase.js` — Supabase client
- `.env.local` — environment variables (already filled in)
- `package.json` — Next.js dependencies

---

## Step 1 — Create database tables in Supabase

1. Go to https://supabase.com/dashboard/project/xcocwwpzscjmglqvavnd
2. Click **SQL Editor** in the left menu
3. Paste the entire contents of `scripts/setup_db.sql`
4. Click **Run**
5. You should see "Success. No rows returned"

---

## Step 2 — Import participants

On your computer, open a terminal in this project folder:

```bash
npm install
node scripts/import_participants.js
```

You should see:
```
Importing 503 participants...
✓ Imported rows 1–100
✓ Imported rows 101–200
...
Done!
```

Verify in Supabase: go to **Table Editor → participants** — should show 503 rows.

---

## Step 3 — Deploy to Vercel

1. Push this folder to a GitHub repo:
```bash
git init
git add .
git commit -m "EVGC attendance system"
gh repo create evgc-attendance --public --push --source=.
```

2. Go to vercel.com → **Add New Project** → import from GitHub → select `evgc-attendance`

3. In Vercel project settings → **Environment Variables**, add these three:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://xcocwwpzscjmglqvavnd.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (service key)

4. Click **Deploy** — Vercel builds and gives you a permanent URL like `https://evgc-attendance.vercel.app`

**Important:** Deploying via GitHub means future pushes auto-deploy, and the URL never changes — no more drag-and-drop issues.

---

## Step 4 — Generate QR code

Once you have the Vercel URL, run:
```bash
node -e "
const qr = require('qrcode');
qr.toFile('qr.png', 'https://YOUR-VERCEL-URL.vercel.app', { width: 500 }, () => console.log('Done'));
"
```

Or send me the URL and I'll generate it for you.

---

## How the system works

1. Participant scans the printed QR code
2. Phone opens your Vercel URL
3. They enter their Employee ID or School ID
4. Page shows their full details (Name, School, District, Batch, Scheduled Date)
5. They confirm → GPS checked → attendance recorded in Supabase
6. If they scan again later → Check-Out recorded
7. All data is in Supabase → view in Table Editor or export as CSV

## Attendance tab structure (in Supabase)
`evgc_id | school_id | name | district | zone | school_name | batch | checkin_time | checkin_distance_m | checkout_time | checkout_distance_m`
