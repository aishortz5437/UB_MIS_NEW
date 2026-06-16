import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
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
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Inserting test division...");
  const { data: div, error: divErr } = await supabase.from('divisions').insert({
    name: 'Test Division ' + Date.now(),
    code: 'TD' + Math.floor(Math.random()*1000),
    description: 'Temp testing division'
  }).select();

  if (divErr) {
    console.error("Failed to insert division:", divErr);
    return;
  }

  const divisionId = div[0].id;
  console.log("Division inserted with ID:", divisionId);

  console.log("Attempting to insert into 'works' with 'ubqn'...");
  const { data: work, error: workErr } = await supabase.from('works').insert({
    ubqn: 'TEST-UBQN-' + Date.now(),
    division_id: divisionId,
    work_name: 'Test Work',
    status: 'Pipeline',
    consultancy_cost: 10000
  }).select();

  if (workErr) {
    console.error("❌ Insert with 'ubqn' FAILED:", workErr.message, workErr.details);
  } else {
    console.log("✅ Insert with 'ubqn' SUCCEEDED! Keys in returned row:", Object.keys(work[0]));
    // Cleanup
    await supabase.from('works').delete().eq('id', work[0].id);
  }

  console.log("Attempting to insert into 'works' with 'sn_no'...");
  const { data: workSn, error: workSnErr } = await supabase.from('works').insert({
    sn_no: 'TEST-SN-' + Date.now(),
    division_id: divisionId,
    work_name: 'Test Work Sn',
    status: 'Pipeline',
    consultancy_cost: 10000
  }).select();

  if (workSnErr) {
    console.error("❌ Insert with 'sn_no' FAILED:", workSnErr.message, workSnErr.details);
  } else {
    console.log("✅ Insert with 'sn_no' SUCCEEDED! Keys in returned row:", Object.keys(workSn[0]));
    // Cleanup
    await supabase.from('works').delete().eq('id', workSn[0].id);
  }

  // Cleanup division
  await supabase.from('divisions').delete().eq('id', divisionId);
}

runTest();
