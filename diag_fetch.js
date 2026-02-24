require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
    console.log('Sending direct HTTP fetch to Supabase...');

    // Check pending_payment orders
    const res = await fetch(`${supabaseUrl}/rest/v1/orders?status=eq.pending_payment&select=id,tenant_id,status,appointment_id,finalized_at`, {
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
        }
    });

    const data = await res.json();
    console.log(`\n✅ Orders with status 'pending_payment': ${data.length}`);
    console.log(JSON.stringify(data, null, 2));

    const res2 = await fetch(`${supabaseUrl}/rest/v1/orders?select=id,status,appointment_id,finalized_at&order=created_at.desc&limit=5`, {
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
        }
    });

    const data2 = await res2.json();
    console.log(`\n⏳ 5 most recent orders overall:`);
    console.log(JSON.stringify(data2, null, 2));
}

check().catch(console.error);
