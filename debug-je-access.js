import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aiudiwocspqgqpfaqhry.supabase.co';
const supabaseKey = 'sb_publishable_62k3I-ArU9wzL5ksAbsS2g_wrE_mk5G';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        // 1. Check user_roles table
        const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*').limit(5);
        console.log("Roles Sample:", roles);
        if (rolesError) console.error("Roles Error:", rolesError);

        // 2. Check works table
        const { data: works, error: worksError } = await supabase.from('works').select('id').limit(1);
        console.log("Works fetch successful?", !!works, "Error:", worksError?.message);
    } catch (e) {
        console.error(e);
    }
}

check();
