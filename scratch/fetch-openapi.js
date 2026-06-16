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

async function fetchOpenAPI() {
  try {
    const url = `${supabaseUrl}/rest/v1/`;
    console.log("Fetching OpenAPI spec from:", url);
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    console.log("Keys in OpenAPI definitions:", Object.keys(data.definitions || {}));
    if (data.definitions && data.definitions.works) {
      console.log("\n--- WORKS DEFINITION ---");
      console.log(JSON.stringify(data.definitions.works.properties, null, 2));
    }
    if (data.definitions && data.definitions.tenders) {
      console.log("\n--- TENDERS DEFINITION ---");
      console.log(JSON.stringify(data.definitions.tenders.properties, null, 2));
    }
  } catch (error) {
    console.error("Error fetching OpenAPI:", error);
  }
}

fetchOpenAPI();
