import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function discover() {
    console.log('--- 🔍 DESCOBERTA DE DADOS ---');

    // Tentar listar todos os atendimentos recentes (ignorar RLS se possível ou ver o que vaza)
    const { data: appts, error } = await supabase
        .from('appointments')
        .select('customer_name, tenant_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Erro ao listar agendamentos:', error);
    } else {
        console.log('Últimos agendamentos no sistema:');
        appts.forEach(a => console.log(`- ${a.customer_name} | Tenant: ${a.tenant_id} | ${a.created_at}`));
    }
}

discover();
