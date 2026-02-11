
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase Admin Client with Service Role Key
// This bypasses RLS and allows deletion of Auth Users
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tenant_id } = body;

        if (!tenant_id) {
            return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 });
        }

        console.log(`[HardDelete] Starting nuclear deletion for tenant: ${tenant_id}`);

        // 1. Find the Owner Profile linked to this Tenant
        // We need the profile ID because it matches the Auth User ID
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role')
            .eq('tenant_id', tenant_id)
            .eq('role', 'owner'); // Target the owner specifically

        if (profileError) {
            console.error('[HardDelete] Error finding owner:', profileError);
            return NextResponse.json({ error: 'Failed to find owner profile' }, { status: 500 });
        }

        const owner = profiles?.[0];

        // 2. Delete the Auth User (if owner exists)
        if (owner && owner.id) {
            console.log(`[HardDelete] Deleting Auth User: ${owner.email} (${owner.id})`);
            const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(owner.id);

            if (deleteUserError) {
                console.error('[HardDelete] Failed to delete Auth User:', deleteUserError);
                // We continue... sometimes user is already gone but profile remains
            } else {
                console.log('[HardDelete] Auth User deleted successfully.');
            }
        } else {
            console.warn('[HardDelete] No owner profile found. Proceeding to delete tenant data only.');
        }

        // 3. Delete the Tenant Data (Cascade should handle relations, but we force delete the tenant root)
        // Using Service Role ensures we bypass any RLS that might block deletion
        const { error: deleteTenantError } = await supabaseAdmin
            .from('tenants')
            .delete()
            .eq('id', tenant_id);

        if (deleteTenantError) {
            console.error('[HardDelete] Failed to delete Tenant record:', deleteTenantError);
            return NextResponse.json({ error: 'Failed to delete tenant record' }, { status: 500 });
        }

        console.log(`[HardDelete] SUCCESS: Tenant ${tenant_id} and associated user removed.`);
        return NextResponse.json({ success: true, message: 'Tenant and User deleted permanently' });

    } catch (error: any) {
        console.error('[HardDelete] Unexpected error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
