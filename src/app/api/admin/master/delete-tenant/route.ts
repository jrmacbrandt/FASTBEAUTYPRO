
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tenant_id } = body;

        // Initialize Supabase Admin Client with Service Role Key
        // This bypasses RLS and allows deletion of Auth Users
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        if (!tenant_id) {
            return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 });
        }

        console.log(`[HardDelete] Starting nuclear deletion for tenant: ${tenant_id}`);

        // 1. Find ALL Profiles linked to this Tenant (Owner + Professionals)
        const { data: allProfiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role')
            .eq('tenant_id', tenant_id);

        if (profileError) {
            console.error('[HardDelete] Error finding profiles:', profileError);
            return NextResponse.json({ error: 'Falha ao buscar perfis vinculados' }, { status: 500 });
        }

        if (!allProfiles || allProfiles.length === 0) {
            console.warn('[HardDelete] No profiles found. Proceeding to delete tenant record only.');
        } else {
            // ** PROTEÇÃO MASTER E EXECUÇÃO DE EXCLUSÃO **
            console.log(`[HardDelete] Found ${allProfiles.length} profiles to remove.`);

            for (const profile of allProfiles) {
                if (profile.email === 'jrmacbrandt@gmail.com') {
                    return NextResponse.json({ error: 'Operação abortada: O Administrador Master está vinculado a esta loja e não pode ser removido.' }, { status: 403 });
                }

                console.log(`[HardDelete] Removing Auth User: ${profile.email} (${profile.id})`);
                const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(profile.id);

                if (deleteUserError) {
                    console.error(`[HardDelete] Failed to delete Auth User ${profile.email}:`, deleteUserError.message);
                }
            }
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
