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
    // Access Control Logic (Definitive Fix)
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

    // --- DEFINITIVE FIX: ROLE OVERRIDE ---
    // Use AuthGuard to check if email is in the hardcoded Master Whitelist.
    // If yes, FORCE role to 'master' regardless of DB value.
    const isMasterOverride = AuthGuard.isMaster(user.email, profile?.role);
    const role = isMasterOverride ? 'master' : profile?.role;

    const status = profile?.status;
    const tenantData = (profile as any)?.tenant || (profile as any)?.tenants;
    const tenantObj = Array.isArray(tenantData) ? tenantData[0] : tenantData;

    const isActive = tenantObj?.active !== false;
    let hasPaid = tenantObj?.has_paid;
    let subscriptionPlan = tenantObj?.subscription_plan;
    const trialEndsAt = tenantObj?.trial_ends_at;

    // --- DEFINITIVE FIX: ACCESS OVERRIDE ---
    // If Master, grant unlimited access automatically.
    if (role === 'master') {
        hasPaid = true;
        subscriptionPlan = 'unlimited';
    }

    // Access Calculation
    const isUnlimited = subscriptionPlan === 'unlimited';
    const isTrialActive = subscriptionPlan === 'trial' && trialEndsAt && new Date(trialEndsAt) > new Date();
    const hasAccess = hasPaid || isUnlimited || isTrialActive;

    const isSuspendedPage = url.pathname === '/unidade-suspensa';

    // 3. Status Checks (Skip for Master)
    if (role !== 'master') {
        // Suspended Tenant
        if (!isActive && !isSuspendedPage) {
            url.pathname = '/unidade-suspensa';
            return NextResponse.redirect(url);
        }
        // Pending Professional
        if (role === 'barber' && status === 'pending' && !isApprovalPage) {
            url.pathname = '/aguardando-aprovacao';
            return NextResponse.redirect(url);
        }
        // Pending Owner (New)
        const tenantStatus = tenantObj?.status;
        if (role === 'owner' && tenantStatus === 'pending_approval' && !isApprovalPage) {
            url.pathname = '/aguardando-aprovacao';
            return NextResponse.redirect(url);
        }
        // Payment Check (Owners only)
        if (role === 'owner' && !hasAccess && !isPaymentPage && tenantStatus !== 'pending_approval') {
            url.pathname = '/pagamento-pendente';
            return NextResponse.redirect(url);
        }
    }

    // 4. Strict Routing (Definitive Separation)
    // If user is on an Auth page OR a Pending page (but is valid), redirect to their home.
    const isValidOwner = role === 'owner' && hasAccess;
    const isValidPro = role === 'barber' && status === 'active';
    const isValidMaster = role === 'master';

    const isRestrictedPage = isAuthPage || isPaymentPage || isApprovalPage;

    if (isRestrictedPage) {
        if (isValidMaster) {
            url.pathname = '/admin-master';
            return NextResponse.redirect(url);
        }
        if (isValidOwner) {
            url.pathname = '/admin';
            return NextResponse.redirect(url);
        }
        if (isValidPro) {
            url.pathname = '/profissional';
            return NextResponse.redirect(url);
        }
    }

    // 5. Hierarchy Protection (Prevent Role Leaks)
    // Master can access everything (no restriction block)

    // Owner trying to access Master areas
    if (role === 'owner' && isMasterPage) {
        url.pathname = '/admin';
        return NextResponse.redirect(url);
    }

    // Professional trying to access Admin or Master areas
    if (role === 'barber' && (isAdminPage || isMasterPage)) {
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
