/**
 * EVGC Attendance System — Import Participants into Supabase
 * Run this ONCE after setting up the database:
 *   node scripts/import_participants.js
 */

const { createClient } = require('@supabase/supabase-js');
const data = require('./participants.json');

const SUPABASE_URL     = 'https://xcocwwpzscjmglqvavnd.supabase.co';
const SUPABASE_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhjb2N3d3B6c2NqbWdscXZhdm5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQ0ODIzMywiZXhwIjoyMTA1MDI0MjMzfQ.WK_u53lWWSFeYiRoFygqf9AJHejEPKO9dqS2r-QobRU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

async function importParticipants() {
  console.log(`Importing ${data.length} participants...`);

  // Insert in batches of 100
  const BATCH = 100;
  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH);
    const { error } = await supabase.from('participants').insert(batch);
    if (error) {
      console.error(`Batch ${i}-${i+BATCH} failed:`, error.message);
    } else {
      console.log(`✓ Imported rows ${i+1}–${Math.min(i+BATCH, data.length)}`);
    }
  }
  console.log('Done!');
}

importParticipants();
