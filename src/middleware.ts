import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthGuard } from './lib/auth-guard';

export async function middleware(request: NextRequest) {
    // 1. Initialize Response (mutated by setAll)
    let supabaseResponse = NextResponse.next({
        request,
    });

    // 2. Create Supabase Client (ssr v0.8.0 compatible)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxunkigrburoknsshezl.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_QA6uHsB4N5T4aprmUICYPA_HPJUwRpr',
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session if expired - mandatory for Server Components
    const { data: { user }, error } = await supabase.auth.getUser();

    // ----------------------------------------------------
    // Access Control Logic (Ported from previous version)
    // ----------------------------------------------------
    const url = request.nextUrl.clone();
    const isAuthPage = url.pathname === '/login' || url.pathname === '/login-master';
    const isMasterPage = url.pathname.startsWith('/admin-master');
    const isAdminPage = url.pathname.startsWith('/admin') && !isMasterPage;
    const isProPage = url.pathname.startsWith('/profissional');
    const isPaymentPage = url.pathname === '/pagamento-pendente';
    const isApprovalPage = url.pathname === '/aguardando-aprovacao';

    // 1. Unauthenticated users
    if (!user) {
        if (isMasterPage || isAdminPage || isProPage) {
            url.pathname = '/login';
            return NextResponse.redirect(url);
        }
        return supabaseResponse;
    }

    // 2. Authenticated users: Fetch role/tenant
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            role, 
            status, 
            tenant (
                active,
                has_paid,
                status,
                subscription_plan,
                trial_ends_at
            )
        `)
        .eq('id', user.id)
        .single();

    const role = profile?.role;
    const status = profile?.status;
    const tenantData = (profile as any)?.tenant || (profile as any)?.tenants;
    const tenantObj = Array.isArray(tenantData) ? tenantData[0] : tenantData;

    const isActive = tenantObj?.active !== false;
    const hasPaid = tenantObj?.has_paid;
    const subscriptionPlan = tenantObj?.subscription_plan;
    const trialEndsAt = tenantObj?.trial_ends_at;

    // Access Logic
    const isUnlimited = subscriptionPlan === 'unlimited';
    const isTrialActive = subscriptionPlan === 'trial' && trialEndsAt && new Date(trialEndsAt) > new Date();
    const hasAccess = hasPaid || isUnlimited || isTrialActive;
    const isSuspendedPage = url.pathname === '/unidade-suspensa';

    // 3. Active check
    if (role !== 'master' && !isActive && !isSuspendedPage) {
        url.pathname = '/unidade-suspensa';
        return NextResponse.redirect(url);
    }
    if (role === 'barber' && status === 'pending' && !isApprovalPage) {
        url.pathname = '/aguardando-aprovacao';
        return NextResponse.redirect(url);
    }

    // Check for pending_approval
    const tenantStatus = tenantObj?.status;
    if (role === 'owner' && tenantStatus === 'pending_approval' && !isApprovalPage) {
        url.pathname = '/aguardando-aprovacao';
        return NextResponse.redirect(url);
    }

    // Redirect to Payment
    if (role === 'owner' && !hasAccess && !isPaymentPage && tenantStatus !== 'pending_approval') {
        url.pathname = '/pagamento-pendente';
        return NextResponse.redirect(url);
    }

    // 4. Redirect logged users from auth/pending pages
    if (isAuthPage || ((isPaymentPage || isApprovalPage) && ((role === 'owner' && hasPaid) || (role === 'barber' && status === 'active')))) {
        if (role === 'master') url.pathname = '/admin-master';
        else if (role === 'owner') url.pathname = '/admin';
        else url.pathname = '/profissional';
        return NextResponse.redirect(url);
    }

    // 5. Role restrictions
    if (isMasterPage && role !== 'master') {
        url.pathname = role === 'owner' ? '/admin' : '/profissional';
        return NextResponse.redirect(url);
    }

    if (isAdminPage && role === 'barber') {
        url.pathname = '/profissional';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

// Configurar em quais caminhos o Middleware deve rodar
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
