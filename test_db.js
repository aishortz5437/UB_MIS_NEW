import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const env = Object.fromEntries(envFile.split('\n').filter(Boolean).map(line => {
  const parts = line.split('=')
  return [parts[0], parts.slice(1).join('=').replace(/"/g, '')]
}))

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('profiles').select('id, employee_id, full_name, email')
  console.log('Profiles in DB:', data)
  if (error) console.error('Error:', error)
}
run()
