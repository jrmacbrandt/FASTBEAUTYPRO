
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- INSPECTING PROFILES ---');
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('email', ['jrbrandt@hotmail.com', 'jrmacbrandt@yahoo.com']);

    if (error) {
        console.error(error);
        return;
    }

    console.table(profiles);

    if (profiles && profiles.length > 0) {
        const tenantIds = profiles.map(p => p.tenant_id).filter(Boolean);
        console.log('\n--- INSPECTING TENANTS ---');
        const { data: tenants } = await supabase.from('tenants').select('*').in('id', tenantIds);
        console.table(tenants);
    }
}

inspect();
