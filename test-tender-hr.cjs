const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://aiudiwocspqgqpfaqhry.supabase.co',
    'sb_publishable_62k3I-ArU9wzL5ksAbsS2g_wrE_mk5G'
);

async function test() {
    console.log('=== TESTING TENDER & HR DB INSERTS ===\n');

    // 1. First get a valid division_id
    const { data: divisions, error: divErr } = await supabase.from('divisions').select('*');
    if (divErr) {
        console.error('❌ Failed to fetch divisions:', divErr.message);
        return;
    }
    console.log('✅ Divisions found:', divisions.map(d => `${d.name} (${d.code})`).join(', '));
    const testDivisionId = divisions[0]?.id;

    if (!testDivisionId) {
        console.error('❌ No divisions found in DB');
        return;
    }

    // 2. Test Tender Insert (same payload as TenderForm.tsx handleSubmit)
    console.log('\n--- Testing TENDER insert ---');
    const tenderData = {
        ubqn: 'TEST-TENDER-001',
        work_name: 'Test Tender Work',
        client_name: 'Test Department',
        division_id: testDivisionId,
        status: 'Pipeline',
        consultancy_cost: 50000,
        subcategory: 'Tender',
        order_no: 'TEND-ID-12345',
        updated_at: new Date().toISOString(),
    };

    const { data: tenderResult, error: tenderErr } = await supabase
        .from('works')
        .insert(tenderData)
        .select();

    if (tenderErr) {
        console.error('❌ Tender insert FAILED:', tenderErr.message);
        console.error('   Details:', tenderErr.details);
        console.error('   Hint:', tenderErr.hint);
    } else if (!tenderResult || tenderResult.length === 0) {
        console.error('❌ Tender insert returned no data (possibly RLS blocked)');
    } else {
        console.log('✅ Tender insert SUCCESS! ID:', tenderResult[0].id);
        console.log('   Subcategory:', tenderResult[0].subcategory);
        console.log('   UBQN:', tenderResult[0].ubqn);
    }

    // 3. Test Hand Receipt Insert (same payload as HandReceiptForm.tsx handleSubmit)
    console.log('\n--- Testing HAND RECEIPT insert ---');
    const hrData = {
        ubqn: 'TEST-HR-001',
        work_name: 'Test HR Work Entry',
        client_name: 'Test HR Department',
        division_id: testDivisionId,
        status: 'Pipeline',
        consultancy_cost: 25000,
        subcategory: 'Hand Receipt',
        order_no: 'LTR-NO-99',
        updated_at: new Date().toISOString(),
    };

    const { data: hrResult, error: hrErr } = await supabase
        .from('works')
        .insert(hrData)
        .select();

    if (hrErr) {
        console.error('❌ HR insert FAILED:', hrErr.message);
        console.error('   Details:', hrErr.details);
        console.error('   Hint:', hrErr.hint);
    } else if (!hrResult || hrResult.length === 0) {
        console.error('❌ HR insert returned no data (possibly RLS blocked)');
    } else {
        console.log('✅ HR insert SUCCESS! ID:', hrResult[0].id);
        console.log('   Subcategory:', hrResult[0].subcategory);
        console.log('   UBQN:', hrResult[0].ubqn);
    }

    // 4. Verify both exist in DB
    console.log('\n--- Verifying records exist ---');
    const { data: verify, error: verifyErr } = await supabase
        .from('works')
        .select('id, ubqn, subcategory, work_name, status, consultancy_cost')
        .in('ubqn', ['TEST-TENDER-001', 'TEST-HR-001']);

    if (verifyErr) {
        console.error('❌ Verify query failed:', verifyErr.message);
    } else {
        console.log(`✅ Found ${verify.length} test record(s) in DB:`);
        verify.forEach(w => {
            console.log(`   - [${w.subcategory}] UBQN: ${w.ubqn} | ${w.work_name} | ₹${w.consultancy_cost} | Status: ${w.status}`);
        });
    }

    // 5. Cleanup - remove test data
    console.log('\n--- Cleaning up test data ---');
    const { error: delErr } = await supabase
        .from('works')
        .delete()
        .in('ubqn', ['TEST-TENDER-001', 'TEST-HR-001']);

    if (delErr) {
        console.error('⚠️  Cleanup failed (may need manual deletion):', delErr.message);
    } else {
        console.log('✅ Test records cleaned up.');
    }

    console.log('\n=== TEST COMPLETE ===');
}

test().catch(console.error);
