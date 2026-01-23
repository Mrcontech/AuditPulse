
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const TEST_USER_ID = 'c3d6cbe8-451c-4495-9ba6-d83369ecb822';
const TEST_URL = 'https://www.google.com';
const DOMAIN = 'google.com';
const TEST_AUDIT_ID = 'deadbeef-dead-beef-dead-beefdeadbeef';

async function runTest() {
    console.log('🚀 Starting Integration Test...');

    // 1. Skip insert, we already did it via SQL
    const audit = { id: TEST_AUDIT_ID };
    console.log(`✅ Using existing Audit ID: ${audit.id}`);

    // 2. Trigger the run-audit Edge Function
    console.log('📡 Triggering run-audit Edge Function...');
    const startTime = Date.now();

    const functionResponse = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/run-audit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
            url: TEST_URL,
            auditId: audit.id
        })
    });

    const functionResult = await functionResponse.json();
    console.log('📥 Function response received:', functionResult);

    if (!functionResponse.ok) {
        console.error('❌ Function call failed:', functionResult);
        return;
    }

    // 3. Monitor for progress updates
    console.log('👀 Monitoring progress in database...');

    const interval = setInterval(async () => {
        const { data: updatedAudit, error: pollError } = await supabase
            .from('audits')
            .select('status, progress, progress_label, error_message')
            .eq('id', audit.id)
            .single();

        if (pollError) {
            console.error('❌ Polling error:', pollError);
            return;
        }

        console.log(`📊 [${updatedAudit.status}] Progress: ${updatedAudit.progress}% - ${updatedAudit.progress_label || 'Initializing...'}`);

        if (updatedAudit.status === 'complete' || updatedAudit.status === 'failed') {
            clearInterval(interval);
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            if (updatedAudit.status === 'complete') {
                console.log(`\n✨ TEST PASSED in ${duration}s!`);

                // 4. Verify results exist
                const { data: results } = await supabase
                    .from('audit_results')
                    .select('id')
                    .eq('audit_id', audit.id);

                console.log(`✅ Verified ${results?.length || 0} result record(s) created.`);
            } else {
                console.error(`\n❌ TEST FAILED in ${duration}s! Error: ${updatedAudit.error_message}`);
            }
            process.exit(updatedAudit.status === 'complete' ? 0 : 1);
        }
    }, 5000); // Check every 5 seconds
}

runTest();
