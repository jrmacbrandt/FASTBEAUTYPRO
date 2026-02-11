
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { professionalId } = await req.json();

        // 1. Setup Admin Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {
            return NextResponse.json({ error: 'Configuração do servidor incompleta (Service Role missing)' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 2. Identify Requester (Security)
        const authHeader = req.headers.get('Authorization');
        const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(authHeader?.split(' ')[1]);

        if (authError || !requester) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Get Requester Profile
        const { data: ownerProfile } = await supabaseAdmin
            .from('profiles')
            .select('role, tenant_id')
            .eq('id', requester.id)
            .single();

        if (ownerProfile?.role !== 'owner') {
            return NextResponse.json({ error: 'Apenas administradores de loja podem excluir profissionais' }, { status: 403 });
        }

        // 3. Get Target Profile
        const { data: targetProfile, error: targetError } = await supabaseAdmin
            .from('profiles')
            .select('email, tenant_id')
            .eq('id', professionalId)
            .single();

        if (targetError || !targetProfile) {
            return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 });
        }

        // 4. CROSS-CHECK: Is the professional in the SAME shop?
        if (targetProfile.tenant_id !== ownerProfile.tenant_id) {
            return NextResponse.json({ error: 'Você só pode excluir profissionais da sua própria loja' }, { status: 403 });
        }

        // 5. MASTER PROTECTION: Never delete the master
        if (targetProfile.email === 'jrmacbrandt@gmail.com') {
            return NextResponse.json({ error: 'O Administrador Master é intocável e não pode ser removido' }, { status: 403 });
        }

        // 6. EXECUTE HARD DELETE
        // Delete from Auth (cascades to Profile due to FK if configured, or we delete profile after)
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(professionalId);
        if (deleteAuthError) throw deleteAuthError;

        // Ensure profile is gone (redundant but safe)
        await supabaseAdmin.from('profiles').delete().eq('id', professionalId);

        return NextResponse.json({ success: true, message: 'Profissional removido completamente do sistema' });

    } catch (error: any) {
        console.error('[DeleteProfessional] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
