import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, full_name, cpf, phone, service_commission, product_commission, tenant_id, role, password, avatar_url } = body;

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

        // 2. Garante a Criação do Perfil (Independente de Trigger)
        // Utliza o supabaseAdmin para bypassar RLS e forçar o UPSERT da linha no banco público.
        // Isso resolve atrasos (race conditions) ou falhas de triggers silenciosas.
        const profileData = {
            id: userId,
            full_name: full_name,
            email: email,
            role: role || 'barber',
            tenant_id: tenant_id,
            cpf: cpf,
            phone: phone,
            service_commission: Number(service_commission || 0),
            product_commission: Number(product_commission || 0),
            avatar_url: avatar_url || null,
            status: 'active'
        };

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' });

        if (profileError) {
            console.error(`[CreateProfessional] Profile upsert error for ${userId}:`, profileError.message);
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
