import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://aiudiwocspqgqpfaqhry.supabase.co"
const supabaseKey = "sb_publishable_62k3I-ArU9wzL5ksAbsS2g_wrE_mk5G"

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data, error } = await supabase.from('user_management_view').select('*').limit(5)
    console.log("data:", data)
    console.log("error:", error)
}
test()
