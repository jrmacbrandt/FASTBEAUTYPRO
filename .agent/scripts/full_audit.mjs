import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fullAudit() {
    const tenantId = '97e69b01-eeef-4d80-960a-f4467b90f505';
    console.log(`--- 🛡️ RELATÓRIO DE AUDITORIA: TENANT ${tenantId} ---`);

    // 1. Verificar Agendamento
    const { data: appts } = await supabase.from('appointments').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1);
    const lastAppt = appts?.[0];

    if (lastAppt) {
        console.log(`\n📅 AGENDAMENTO:
        ID: ${lastAppt.id}
        Cliente: ${lastAppt.customer_name}
        Status: ${lastAppt.status} (Esperado: paid)`);

        // 2. Verificar Comanda vinculada
        const { data: orders } = await supabase.from('orders').select('*').eq('appointment_id', lastAppt.id);
        const lastOrder = orders?.[0];

        if (lastOrder) {
            console.log(`\n🛒 COMANDA:
            ID: ${lastOrder.id}
            Total: R$ ${lastOrder.total_value}
            Método: ${lastOrder.payment_method}
            Taxas: Serviços R$ ${lastOrder.fee_amount_services} | Produtos R$ ${lastOrder.fee_amount_products}
            Finalizada em: ${lastOrder.finalized_at}`);

            // 3. Verificar Estoque
            const { data: stock } = await supabase.from('stock_transactions').select('*, products(name)').eq('reference_id', lastOrder.id);
            if (stock && stock.length > 0) {
                console.log(`\n📦 MOVIMENTAÇÕES DE ESTOQUE:`);
                stock.forEach(s => {
                    console.log(`            - Item: ${s.products?.name} | Qtd: -${s.quantity} | Motivo: ${s.reason}`);
                });
            } else {
                console.log(`\n📦 ESTOQUE: Nenhuma baixa registrada para esta comanda.`);
            }
        } else {
            console.log(`\n🛒 COMANDA: Não encontrada para o ID de agendamento ${lastAppt.id}`);
        }
    } else {
        console.log('Nenhum agendamento encontrado.');
    }
}

fullAudit();
