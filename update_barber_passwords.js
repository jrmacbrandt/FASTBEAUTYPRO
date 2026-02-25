const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing environment variables.");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
    console.log("Fetching all users to update barber passwords...");

    // We might need to paginate if there are many users, but for now we list the first page.
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        console.error("Error fetching users:", error);
        process.exit(1);
    }

    const barbers = data.users.filter(user => user.user_metadata?.role === 'barber');
    console.log(`Found ${barbers.length} barbers. Assuring default password...`);

    let updatedCount = 0;
    for (const barber of barbers) {
        console.log(`Updating password for ${barber.email}...`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            barber.id,
            { password: '12345678' }
        );

        if (updateError) {
            console.error(`Failed to update ${barber.email}:`, updateError);
        } else {
            updatedCount++;
        }
    }

    console.log(`Successfully updated ${updatedCount} barbers to the new default password '12345678'.`);
}

main();
