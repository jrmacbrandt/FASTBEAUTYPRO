
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
            console.warn('[HardDelete] No profiles found for this tenant.');
        } else {
            // ** PROTEÇÃO MASTER **
            console.log(`[HardDelete] Checking ${allProfiles.length} profiles for Master protection.`);
            for (const profile of allProfiles) {
                if (profile.email === 'jrmacbrandt@gmail.com') {
                    console.error('[HardDelete] 🛑 ABORTED: Master Admin protection triggered!');
                    return NextResponse.json({ error: 'Operação abortada: O Administrador Master está vinculado a esta loja e não pode ser removido.' }, { status: 403 });
                }
            }
        }

        // 3. NUCLEAR DELETE: Call optimized RPC (Deletes all DB dependencies)
        console.log(`[HardDelete] Invoking SQL RPC 'delete_tenant_cascade' for: ${tenant_id}`);
        const { error: rpcError } = await supabaseAdmin.rpc('delete_tenant_cascade', {
            target_tenant_id: tenant_id
        });

        if (rpcError) {
            console.error('[HardDelete] ❌ RPC FAILURE:', rpcError);
            return NextResponse.json({ error: 'Falha na exclusão atômica (RPC): ' + rpcError.message }, { status: 500 });
        }

        // 4. CLEANUP AUTH: Remove users from Supabase Auth ONLY if DB records are gone
        console.log('[HardDelete] Database records cleared. Proceeding to Auth cleanup...');
        if (allProfiles && allProfiles.length > 0) {
            for (const profile of allProfiles) {
                console.log(`[HardDelete] Removing Auth User: ${profile.email} (${profile.id})`);
                const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(profile.id);
                if (deleteUserError) {
                    console.warn(`[HardDelete] Failed to delete Auth User ${profile.email}:`, deleteUserError.message);
                }
            }
        }

        console.log(`[HardDelete] SUCCESS: Tenant ${tenant_id} and all dependencies removed via V6-Supreme RPC.`);
        return NextResponse.json({ success: true, message: 'Unidade e usuários removidos permanentemente (V6-Supreme Nuclear OK)' });

    } catch (error: any) {
        console.error('[HardDelete] Unexpected error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
