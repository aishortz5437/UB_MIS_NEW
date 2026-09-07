import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const env = Object.fromEntries(envFile.split('\n').filter(Boolean).map(line => {
  const parts = line.split('=');
  return [parts[0], parts.slice(1).join('=').replace(/"/g, '')];
}));

const url = env.VITE_SUPABASE_URL + '/rest/v1/profiles?select=id,full_name,employee_id';
const res = await fetch(url, {
  headers: {
    'apikey': env.VITE_SUPABASE_PUBLISHABLE_KEY,
    'Authorization': 'Bearer ' + env.VITE_SUPABASE_PUBLISHABLE_KEY
  }
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
