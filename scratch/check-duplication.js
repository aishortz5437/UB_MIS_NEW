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

async function check() {
  console.log("Fetching all works...");
  const { data: works, error } = await supabase
    .from('works')
    .select('id, ubqn, work_name, status, consultancy_cost');
  
  if (error) {
    console.error("Error fetching works:", error);
    return;
  }

  console.log(`Total works: ${works.length}`);

  // Count by status
  const counts = {};
  works.forEach(w => {
    counts[w.status] = (counts[w.status] || 0) + 1;
  });
  console.log("Counts by status:", counts);

  // Find duplicates by ubqn
  const ubqnGroups = {};
  works.forEach(w => {
    if (!ubqnGroups[w.ubqn]) ubqnGroups[w.ubqn] = [];
    ubqnGroups[w.ubqn].push(w);
  });

  console.log("\nChecking for duplicate UBQN:");
  let dupCount = 0;
  for (const ubqn in ubqnGroups) {
    if (ubqnGroups[ubqn].length > 1) {
      dupCount++;
      console.log(`UBQN: ${ubqn} has ${ubqnGroups[ubqn].length} records:`);
      ubqnGroups[ubqn].forEach(w => {
        console.log(`  - ID: ${w.id}, Name: ${w.work_name}, Status: ${w.status}, Cost: ${w.consultancy_cost}`);
      });
    }
  }
  if (dupCount === 0) {
    console.log("No duplicate UBQNs found!");
  }
}

check();
