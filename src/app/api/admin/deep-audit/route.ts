import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        if (!serviceRoleKey) {
            return NextResponse.json({ error: 'Falta SERVICE_ROLE_KEY no servidor' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Audit AUTH USERS
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        // 2. Audit PROFILES
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role, tenant_id');
        if (profileError) throw profileError;

        // 3. Audit TENANTS
        const { data: tenants, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .select('id, name, slug');
        if (tenantError) throw tenantError;

        // 4. Analysis
        const professionalsInProfiles = profiles.filter(p => p.role === 'barber');
        const masterUsers = users.filter(u => u.email === 'jrmacbrandt@gmail.com');

        return NextResponse.json({
            summary: {
                total_auth_users: users.length,
                total_profiles: profiles.length,
                total_tenants: tenants.length,
                professionals_found: professionalsInProfiles.length
            },
            details: {
                tenants: tenants,
                professionals_in_profiles: professionalsInProfiles,
                // List only non-master users to keep it clean but safe
                other_auth_users: users.filter(u => u.email !== 'jrmacbrandt@gmail.com').map(u => ({
                    id: u.id,
                    email: u.email,
                    created_at: u.created_at
                }))
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
