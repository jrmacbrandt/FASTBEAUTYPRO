
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function runAudit() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env: any = {};
    envContent.split('\n').forEach(line => {
        const [key, ...rest] = line.split('=');
        if (key && rest.length) env[key.trim()] = rest.join('=').trim().replace(/["]+/g, '');
    });

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials in .env.local');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- AUDITORIA DE CLIENTES (CRM) ---');

    // We can't easily get the session here without a user login, 
    // but we can try to find the tenant_id from the profiles table if RLS allows (unlikely with anon key without session)
    // However, if RLS is enabled, we might get 0. 
    // BUT! If the dashboard shows 1, it means the dashboard'S session is seeing 1.

    console.log('Verificando se há registros na tabela "clients"...');
    const { data, count, error } = await supabase
        .from('clients')
        .select('name, phone, tenant_id', { count: 'exact' });

    if (error) {
        console.error('Erro ao acessar tabela clients:', error.message);
    } else {
        console.log(`Registros encontrados (via anon key): ${count}`);
        console.table(data);
    }
}

runAudit();
