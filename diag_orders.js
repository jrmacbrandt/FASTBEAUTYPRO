const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production.local' });

// Initialize Supabase Admin Client with Service Role Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runDiagnostics() {
    console.log('🔄 Running Diagnostics on Orders and Appointments...');

    // Check the latest orders 
    const { data: latestOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, tenant_id, appointment_id, finalized_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (ordersError) console.error('Error fetching orders:', ordersError);
    else console.log('\n✅ Latest Orders:\n', latestOrders);

    // Check the latest appointments
    const { data: latestAppts, error: apptError } = await supabase
        .from('appointments')
        .select('id, status, tenant_id, customer_name, professional_id')
        .order('created_at', { ascending: false })
        .limit(10);

    if (apptError) console.error('Error fetching appts:', apptError);
    else console.log('\n✅ Latest Appointments:\n', latestAppts);

    // Specifically check ANY order with pending_payment
    const { data: pendingOrders } = await supabase
        .from('orders')
        .select('id, tenant_id')
        .eq('status', 'pending_payment');

    console.log(`\n✅ Total orders strictly with status 'pending_payment': ${pendingOrders ? pendingOrders.length : 0}`);
}

runDiagnostics();
