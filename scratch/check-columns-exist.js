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

async function check() {
  console.log("Checking if column 'ubqn' exists in 'works'...");
  const { data: dataUbqn, error: errUbqn } = await supabase.from('works').select('ubqn').limit(1);
  if (errUbqn) {
    console.log("❌ Column 'ubqn' does NOT exist or error:", errUbqn.message);
  } else {
    console.log("✅ Column 'ubqn' exists!");
  }

  console.log("\nChecking if column 'sn_no' exists in 'works'...");
  const { data: dataSn, error: errSn } = await supabase.from('works').select('sn_no').limit(1);
  if (errSn) {
    console.log("❌ Column 'sn_no' does NOT exist or error:", errSn.message);
  } else {
    console.log("✅ Column 'sn_no' exists!");
  }
}

check();
