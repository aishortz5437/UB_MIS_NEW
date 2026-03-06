import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
  if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/^"|"$/g, '');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  // try to fetch a single work with R2 pending
  const { data: work, error } = await supabase.from('works')
    .select('id, status, pending_r2_approval')
    .eq('pending_r2_approval', true)
    .limit(1);
  console.log("Pending Works:", work, error?.message);

  // how many works?
  const { count } = await supabase.from('works').select('*', { count: 'exact', head: true });
  console.log("Total works in DB:", count);
}

checkRLS();
