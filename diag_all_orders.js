
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://sxunkigrburoknsshezl.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dW5raWdyYnVyb2tuc3NoZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTA3ODksImV4cCI6MjA4NTg2Njc4OX0.bnBzEbQEcoP0rPXzaGMj1r493hmN73ut1xVGkdWj6Eo";

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllRecentOrders() {
    console.log('--- BUSCANDO TODAS AS COMANDAS RECENTES (ÚLTIMAS 24H) ---');

    // ISO string for 24h ago
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('orders')
        .select(`
            id, 
            total_value, 
            status, 
            finalized_at,
            created_at,
            appointments (
                customer_name,
                profiles (full_name)
            )
        `)
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('Nenhuma comanda encontrada nas últimas 24h.');
    } else {
        console.log(`Encontradas ${data.length} comandas:\n`);
        data.forEach((o, i) => {
            console.log(`${i + 1}. Cliente: ${o.appointments?.customer_name || 'N/A'}`);
            console.log(`   Status: ${o.status}`);
            console.log(`   Valor: R$ ${o.total_value}`);
            console.log(`   Criada em: ${new Date(o.created_at).toLocaleString()}`);
            console.log(`   Finalizada em: ${o.finalized_at ? new Date(o.finalized_at).toLocaleString() : 'NÃO FINALIZADA'}`);
            console.log(`   ID Comanda: ${o.id}`);
            console.log('-----------------------------------');
        });
    }
}

listAllRecentOrders();
