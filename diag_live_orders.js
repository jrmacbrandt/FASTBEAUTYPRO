
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://sxunkigrburoknsshezl.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dW5raWdyYnVyb2tuc3NoZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTA3ODksImV4cCI6MjA4NTg2Njc4OX0.bnBzEbQEcoP0rPXzaGMj1r493hmN73ut1xVGkdWj6Eo";

const supabase = createClient(supabaseUrl, supabaseKey);

async function listPendingOrders() {
    console.log('--- BUSCANDO COMANDAS PENDENTES ---');
    const { data, error } = await supabase
        .from('orders')
        .select(`
            id, 
            total_value, 
            status, 
            finalized_at,
            appointments (
                customer_name,
                scheduled_at,
                profiles (full_name)
            )
        `)
        .eq('status', 'pending_payment')
        .order('finalized_at', { ascending: false });

    if (error) {
        console.error('Erro:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('Nenhuma comanda pendente encontrada no banco.');
    } else {
        console.log(`Encontradas ${data.length} comandas:\n`);
        data.forEach((o, i) => {
            console.log(`${i + 1}. Cliente: ${o.appointments?.customer_name || 'N/A'}`);
            console.log(`   Profissional: ${o.appointments?.profiles?.full_name || 'N/A'}`);
            console.log(`   Valor: R$ ${o.total_value}`);
            console.log(`   Finalizada em: ${new Date(o.finalized_at).toLocaleString()}`);
            console.log(`   ID Comanda: ${o.id}`);
            console.log('-----------------------------------');
        });
    }
}

listPendingOrders();
