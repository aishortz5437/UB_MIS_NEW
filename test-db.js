import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('quotations').select('*').limit(1);
  console.log('quotations columns:', data ? Object.keys(data[0] || {}) : error);
  const { data: qData, error: qError } = await supabase.from('works').select('*').limit(1);
  console.log('works columns:', qData ? Object.keys(qData[0] || {}) : qError);
}
run();
