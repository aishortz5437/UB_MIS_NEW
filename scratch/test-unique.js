import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // Insert a temp division
  const tempDivName = 'TEMP-DIV-TEST-' + Math.random().toString(36).substring(7);
  const tempDivCode = 'TDT' + Math.random().toString(36).substring(7).toUpperCase().slice(0, 3);
  
  console.log(`Inserting temp division: ${tempDivName} (${tempDivCode})...`);
  const { data: divData, error: divErr } = await supabase.from('divisions').insert({
    name: tempDivName,
    code: tempDivCode,
    description: 'Temporary testing division'
  }).select();

  if (divErr) {
    console.error("Failed to insert division:", divErr.message);
    return;
  }

  const divisionId = divData[0].id;
  console.log(`Temp division inserted with ID: ${divisionId}`);

  const ubqn = 'TEMP-TEST-UNIQUE-' + Math.random().toString(36).substring(7).toUpperCase();
  console.log(`Inserting first work with ubqn = ${ubqn}...`);
  const { data: d1, error: e1 } = await supabase.from('works').insert({
    ubqn,
    work_name: 'Test Unique 1',
    division_id: divisionId,
    sn_no: 'TEMP-SN-A-' + Math.random().toString(36).substring(7)
  }).select();
  console.log("Insert 1 result:", d1 ? "Success" : "Failed", e1?.message);

  console.log(`Inserting second work with same ubqn = ${ubqn}...`);
  const { data: d2, error: e2 } = await supabase.from('works').insert({
    ubqn,
    work_name: 'Test Unique 2',
    division_id: divisionId,
    sn_no: 'TEMP-SN-B-' + Math.random().toString(36).substring(7)
  }).select();
  console.log("Insert 2 result:", d2 ? "Success" : "Failed", e2?.message);

  // Clean up
  console.log("Cleaning up...");
  await supabase.from('works').delete().eq('division_id', divisionId);
  await supabase.from('divisions').delete().eq('id', divisionId);
}

test();
