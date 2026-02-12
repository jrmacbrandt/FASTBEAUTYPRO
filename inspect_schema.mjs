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

async function inspectSchema() {
    console.log('--- Inspecting "notifications" Table Structure ---')

    // Attempt to get a single row to see column keys
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        // If empty, try to get column names from an empty select (Supabase doesn't support this easily via Rest)
        // Let's try to insert a dummy row with only ID (if serial) or fail to see what columns it complains about
        console.log('Table is empty. Attempting a dry-run insert...');
        const { error: iError } = await supabase
            .from('notifications')
            .insert({ dummy: 'column' });

        console.log('Insert error msg (helpful for metadata):', iError?.message);
    }
}

inspectSchema()
