import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function audit() {
    console.log('--- 🛡️ INICIANDO AUDITORIA DE SEGURANÇA E INTEGRIDADE ---');

    const tenantId = '97e69b01-eeef-4d80-960a-f4467b90f505';
    console.log(`✅ TENANT IDENTIFICADO: ${tenantId}`);

    // 2. Auditar Comandas Recentes (Verificar Gravação de Valores e Taxas)
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(3);

    console.log('\n💎 AUDITORIA DE COMANDAS (FINANCEIRO):');
    if (orders && orders.length > 0) {
        orders.forEach(o => {
            console.log(`- Comanda ID: ${o.id}`);
            console.log(`  Status: ${o.status}`);
            console.log(`  Total: R$ ${o.total_value} | Método: ${o.payment_method || 'PENDENTE'}`);
            console.log(`  Taxas Aplicadas: Serviços R$ ${o.fee_amount_services} | Produtos R$ ${o.fee_amount_products}`);
            console.log(`  Data: ${new Date(o.created_at).toLocaleString()}`);
            console.log('  ---');
        });
    } else {
        console.log('Nenhuma comanda encontrada para este tenant.');
    }

    // 3. Auditar Movimentações de Estoque (Verificar Baixa Automática)
    const { data: stock, error: stockError } = await supabase
        .from('stock_transactions')
        .select('*, products(name), supplies(name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('\n📦 AUDITORIA DE ESTOQUE (LOGÍSTICA):');
    if (stock && stock.length > 0) {
        stock.forEach(s => {
            const item = s.products?.name || s.supplies?.name || 'Item ID: ' + (s.product_id || s.supply_id);
            console.log(`- Item: ${item}`);
            console.log(`  Tipo: ${s.type} | Qtd: ${s.quantity} | Motivo: ${s.reason}`);
            console.log(`  Data: ${new Date(s.created_at).toLocaleString()}`);
        });
    } else {
        console.log('Nenhuma movimentação de estoque registrada recentemente.');
    }

    // 4. Verificar Agendamentos (Ciclo de Vida)
    const { data: appts, error: apptError } = await supabase
        .from('appointments')
        .select('id, customer_name, status, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(3);

    console.log('\n📅 AUDITORIA DE AGENDAMENTOS (CRM):');
    if (appts && appts.length > 0) {
        appts.forEach(a => {
            console.log(`- Cliente: ${a.customer_name} | Status: ${a.status} | Criado em: ${new Date(a.created_at).toLocaleString()}`);
        });
    }
}

audit();
