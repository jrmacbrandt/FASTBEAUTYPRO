import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // 1. Verificar se existe uma sessão ativa
    const { data: { session } } = await supabase.auth.getSession();

    const url = req.nextUrl.clone();
    const path = url.pathname;

    // 2. Definir as rotas públicas (que não precisam de login)
    const isPublicRoute = path === '/' || path === '/sistema' || path === '/login' || path === '/login-master' || path.startsWith('/[slug]');

    if (!session && !isPublicRoute) {
        // Se não está logado e tenta aceder a área protegida -> Login
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    if (session) {
        // 3. Procurar o perfil do utilizador e o status da barbearia (Tenant)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, status, tenant_id, tenants(active, trial_ends_at)')
            .eq('id', session.user.id)
            .single();

        // 4. Bloqueio de Utilizador Pendente ou Suspenso
        if (profile?.status !== 'active' && !path.startsWith('/aguardando-aprovacao') && !path.startsWith('/login')) {
            url.pathname = '/aguardando-aprovacao';
            return NextResponse.redirect(url);
        }

        // 5. Proteção de Rotas por Nível de Acesso (RBAC)

        // Admin Master: Só acede a /admin-master
        if (path.startsWith('/admin-master') && profile?.role !== 'master') {
            url.pathname = '/sistema';
            return NextResponse.redirect(url);
        }

        // Proprietário (Owner): Não acede a /admin-master nem a áreas exclusivas de barbeiros
        if (path.startsWith('/admin') && profile?.role !== 'owner') {
            url.pathname = '/profissional';
            return NextResponse.redirect(url);
        }

        // Barbeiro: Proibido de entrar em /admin ou /admin-master
        if ((path.startsWith('/admin') || path.startsWith('/admin-master')) && profile?.role === 'barber') {
            url.pathname = '/profissional';
            return NextResponse.redirect(url);
        }

        // 6. Verificação de Pagamento/Bloqueio (Regra do PRD)
        // @ts-ignore - profile?.tenants is handled by join
        const isTenantActive = profile?.tenants?.active;
        // @ts-ignore
        const isTrialValid = new Date(profile?.tenants?.trial_ends_at || 0) > new Date();

        if (profile?.role === 'owner' && !isTenantActive && !isTrialValid && !path.startsWith('/pagamento-pendente')) {
            url.pathname = '/pagamento-pendente';
            return NextResponse.redirect(url);
        }
    }

    return res;
}

// Configurar em quais caminhos o Middleware deve rodar
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
