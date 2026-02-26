import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function audit() {
    console.log('--- 🛡️ INICIANDO AUDITORIA DE FLUXO ---');

    // 1. Get recent appointments (last 2 hours)
    const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select(`
            id, 
            customer_name, 
            status, 
            created_at, 
            scheduled_at,
            tenants(id, name, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

    if (apptError) {
        console.error('Erro ao buscar agendamentos:', apptError);
        return;
    }

    console.log('\n📅 ÚLTIMOS AGENDAMENTOS:');
    appointments.forEach(a => {
        console.log(`- ID: ${a.id} | Cliente: ${a.customer_name} | Status: ${a.status} | Loja: ${a.tenants?.name}`);
    });

    if (appointments.length === 0) return;

    const tenantId = appointments[0].tenants.id;
    console.log(`\n🔍 AUDITANDO TENANT ID: ${tenantId} (${appointments[0].tenants.name})`);

    // 2. Get recent orders
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(3);

    console.log('\n🛒 ÚLTIMAS COMANDAS (PEDIDOS):');
    orders.forEach(o => {
        console.log(`- ID: ${o.id} | Total: R$ ${o.total_amount} | Status: ${o.status} | Pagamento: ${o.payment_method || 'NÃO INFORMADO'}`);
    });

    // 3. Get recent stock transactions
    const { data: transactions, error: transError } = await supabase
        .from('stock_transactions')
        .select('*, products(name), supplies(name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n📦 MOVIMENTAÇÕES DE ESTOQUE:');
    transactions.forEach(t => {
        const item = t.products?.name || t.supplies?.name || 'Item Desconhecido';
        console.log(`- Tipo: ${t.type} | Item: ${item} | Qtd: ${t.quantity} | Motivo: ${t.reason}`);
    });
}

audit();
