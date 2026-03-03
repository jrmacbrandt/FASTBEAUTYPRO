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

        const email = 'jrmacbrandt@yahoo.com';

        // 1. Find User by Email
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const targetUser = users.find(u => u.email === email);

        if (!targetUser) {
            return NextResponse.json({ error: `Usuário ${email} não encontrado no Auth` }, { status: 404 });
        }

        // 2. Force Update Password to 12345678 and confirm email
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            targetUser.id,
            {
                password: '12345678',
                email_confirm: true
            }
        );

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            message: `Senha de ${email} resetada com sucesso para 12345678 e e-mail confirmado.`,
            userId: targetUser.id
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
