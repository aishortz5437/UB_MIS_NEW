import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/^"|"$/g, '');
    if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/^"|"$/g, '');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubmitApproval() {
    try {
        console.log("Mocking a save payload...");

        // This is exactly the payload the WorkForm sends
        let mockWorkData = {
            work_name: "Test Approval",
            client_name: "Test Client",
            status: "Pipeline",
            consultancy_cost: 0,
            pending_r2_approval: true,
            r2_approval_requested_by: "00000000-0000-0000-0000-000000000000" // We will get an error here possibly
        };

        const { data, error } = await supabase.from('works').insert(mockWorkData);
        console.log("Insert result:", { error: error?.message, data });

    } catch (e) {
        console.error(e);
    }
}

testSubmitApproval();
