import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkOrders() {
    const tenantId = '97e69b01-eeef-4d80-960a-f4467b90f505';
    console.log('Checking all orders for tenant...');
    const { data: orders, error } = await supabase.from('orders').select('*').eq('tenant_id', tenantId).limit(20);
    if (error) console.error(error);
    console.log(`Found ${orders?.length || 0} orders.`);
    orders?.forEach(o => console.log(`Order ID: ${o.id} | Status: ${o.status} | Appmt ID: ${o.appointment_id}`));
}

checkOrders();
