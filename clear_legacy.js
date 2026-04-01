import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://aiudiwocspqgqpfaqhry.supabase.co", "sb_publishable_62k3I-ArU9wzL5ksAbsS2g_wrE_mk5G");

async function check() {
    const { data: works, error } = await supabase.from('works').select('*').limit(2);
    if (works && works.length > 0) {
        console.log("Work Object Keys:", Object.keys(works[0]));
    }
}
check();
