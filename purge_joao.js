const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
    console.log("Looking for João Parangolé (jrmacbrandt2@gmail.com)...");

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
        console.error("Error listing users:", usersError);
        return;
    }

    const joao = usersData.users.find(u => u.email === 'jrmacbrandt2@gmail.com');

    if (joao) {
        console.log(`Found Joao in Auth: ${joao.id}. Deleting him...`);
        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(joao.id);
        if (delError) {
            console.error("Error deleting from auth:", delError);
        } else {
            console.log("Successfully deleted from auth.");
        }
    } else {
        console.log("Joao not found in Auth. Checking profiles table...");
    }

    // also try to delete from profiles directly in case he is lingering
    console.log("Deleting from profiles table where email = jrmacbrandt2@gmail.com");
    const { data: prof, error: profError } = await supabaseAdmin.from('profiles').delete().eq('email', 'jrmacbrandt2@gmail.com').select();

    if (profError) {
        console.error("Error deleting profile:", profError);
    } else {
        console.log("Deleted profiles:", prof.length);
    }
}

main();
