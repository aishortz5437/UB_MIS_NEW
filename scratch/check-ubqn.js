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

const supabaseUrl = env.VITE_SUPABASE_URL || "https://aiudiwocspqgqpfaqhry.supabase.co";
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_62k3I-ArU9wzL5ksAbsS2g_wrE_mk5G";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking Supabase tables for UBQN...");

  // Query works
  const { data: works, error: worksErr } = await supabase.from('works').select('*');
  if (worksErr) {
    console.error("Error fetching works:", worksErr);
  } else {
    console.log(`\n--- WORKS TABLE (Total: ${works.length}) ---`);
    if (works.length > 0) {
      console.log("Keys available in first work record:", Object.keys(works[0]));
      
      const sample = works[0];
      console.log("Sample work - id:", sample.id, "sn_no:", sample.sn_no, "ubqn:", sample.ubqn);

      const ubqnCounts = {};
      const snNoCounts = {};
      works.forEach(w => {
        if (w.ubqn) {
          ubqnCounts[w.ubqn] = (ubqnCounts[w.ubqn] || 0) + 1;
        }
        if (w.sn_no) {
          snNoCounts[w.sn_no] = (snNoCounts[w.sn_no] || 0) + 1;
        }
      });

      const duplicateUbqn = Object.entries(ubqnCounts).filter(([k, v]) => v > 1);
      const duplicateSnNo = Object.entries(snNoCounts).filter(([k, v]) => v > 1);

      console.log("Duplicate ubqn values in works:", duplicateUbqn);
      console.log("Duplicate sn_no values in works:", duplicateSnNo);
    }
  }

  // Query quotations
  const { data: quotations, error: quotationsErr } = await supabase.from('quotations').select('*');
  if (quotationsErr) {
    console.error("Error fetching quotations:", quotationsErr);
  } else {
    console.log(`\n--- QUOTATIONS TABLE (Total: ${quotations.length}) ---`);
    if (quotations.length > 0) {
      const counts = {};
      quotations.forEach(q => {
        if (q.ubqn) counts[q.ubqn] = (counts[q.ubqn] || 0) + 1;
      });
      const duplicates = Object.entries(counts).filter(([k, v]) => v > 1);
      console.log("Duplicate ubqn values in quotations:", duplicates);
    }
  }

  // Query tenders
  const { data: tenders, error: tendersErr } = await supabase.from('tenders').select('*');
  if (tendersErr) {
    console.error("Error fetching tenders:", tendersErr);
  } else {
    console.log(`\n--- TENDERS TABLE (Total: ${tenders.length}) ---`);
    if (tenders.length > 0) {
      const counts = {};
      tenders.forEach(t => {
        if (t.ubqn) counts[t.ubqn] = (counts[t.ubqn] || 0) + 1;
      });
      const duplicates = Object.entries(counts).filter(([k, v]) => v > 1);
      console.log("Duplicate ubqn values in tenders:", duplicates);
    }
  }

  // Query hand_receipts
  const { data: handReceipts, error: hrErr } = await supabase.from('hand_receipts').select('*');
  if (hrErr) {
    console.error("Error fetching hand_receipts:", hrErr);
  } else {
    console.log(`\n--- HAND RECEIPTS TABLE (Total: ${handReceipts.length}) ---`);
    if (handReceipts.length > 0) {
      const counts = {};
      handReceipts.forEach(hr => {
        if (hr.ubqn) counts[hr.ubqn] = (counts[hr.ubqn] || 0) + 1;
      });
      const duplicates = Object.entries(counts).filter(([k, v]) => v > 1);
      console.log("Duplicate ubqn values in hand_receipts:", duplicates);
    }
  }
}

check();
