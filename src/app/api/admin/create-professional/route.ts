import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, full_name, cpf, phone, service_commission, product_commission, tenant_id, role, password } = body;

        // Initialize Supabase Admin Client with Service Role Key
        // This bypasses RLS to allow Auth User creation
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
            return NextResponse.json({ error: 'Configuração do servidor ausente (Service Role)' }, { status: 500 });
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

        if (!email || !tenant_id || !full_name) {
            return NextResponse.json({ error: 'Dados obrigatórios (email, nome, tenant_id) não preenchidos' }, { status: 400 });
        }

        console.log(`[CreateProfessional] Starting creation for: ${email}`);

        // 1. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: password || '123456', // Default simple password if none provided
            email_confirm: true,
            user_metadata: {
                full_name,
                cpf,
                phone,
                role: role || 'barber',
                tenant_id
            }
        });

        if (authError) {
            console.error('[CreateProfessional] Auth Error:', authError.message);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const userId = authData.user.id;

        // 2. Wait for the database trigger `handle_new_user` to create the initial profile
        await new Promise(resolve => setTimeout(resolve, 600));

        // 3. Update the profile with specific fields that the trigger ignores or defaults
        // Uses the admin client to bypass RLS UPDATE restrictions
        const profileUpdates = {
            service_commission: Number(service_commission || 0),
            product_commission: Number(product_commission || 0),
            phone: phone, // Trigger doesn't handle phone
            status: 'active' // Override 'pending' state
        };

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', userId);

        if (profileError) {
            console.error(`[CreateProfessional] Profile update error for ${userId}:`, profileError.message);
            // We don't fail the request here, but log the warning, since the auth user is created.
        }

        return NextResponse.json({
            success: true,
            message: 'Profissional criado com sucesso no Authentication e Profiles',
            user: authData.user
        });

    } catch (error: any) {
        console.error('[CreateProfessional] Unexpected error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
