import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client — for read-only lookups from the browser
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Service client — for writes (used only in API routes, never in browser)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SVC);
