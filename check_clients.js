const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('clients').select('*').eq('phone', '21982872653');
    console.log("CLIENTES:", JSON.stringify(data, null, 2));

    // Contar total de duplicados geral (opcional)
    if (error) {
        console.error("ERRO:", error);
    }
}

run();
