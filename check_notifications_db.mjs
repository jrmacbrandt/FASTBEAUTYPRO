import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
    envContent
        .split('\n')
        .filter(line => line.includes('=') && !line.startsWith('#'))
        .map(line => {
            const [key, ...val] = line.split('=')
            return [key.trim(), val.join('=').trim().replace(/^"(.*)"$/, '$1')]
        })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function checkRLS() {
    console.log('--- Checking RLS Policies for "notifications" ---')

    // We can't query pg_policies with anon key easily unless there's a RPC or it's public.
    // Let's try to just insert a dummy notification and read it back to see if it works.

    const testReceiverId = '00000000-0000-0000-0000-000000000000'; // dummy uuid

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);

    if (error) {
        console.log('Error reading notifications:', error.message);
    } else {
        console.log('Read success. Found:', data.length, 'records.');
    }

    // Check if table exists
    const { error: tError } = await supabase.from('notifications').select('id').limit(1);
    if (tError && tError.code === '42P01') {
        console.error('❌ Table "notifications" does not exist!');
    } else {
        console.log('✅ Table "notifications" exists.');
    }
}

checkRLS()
