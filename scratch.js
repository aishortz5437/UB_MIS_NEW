import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('works').select('ubqn').order('created_at', { ascending: false }).limit(20);
  console.log("Works:", data?.map(d => d.ubqn));
  const { data: qData } = await supabase.from('quotations').select('ubqn').order('created_at', { ascending: false }).limit(20);
  console.log("Quotations:", qData?.map(d => d.ubqn));
}
check();
