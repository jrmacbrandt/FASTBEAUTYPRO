import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthGuard } from './lib/auth-guard';

export async function middleware(request: NextRequest) {
    const res = NextResponse.next();

    // Create Supabase Client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxunkigrburoknsshezl.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_QA6uHsB4N5T4aprmUICYPA_HPJUwRpr',
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    request.cookies.set({ name, value, ...options });
                    res.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    request.cookies.set({ name, value: '', ...options });
                    res.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // Refresh session if expired - mandatory for Server Components
    const { data: { user } } = await supabase.auth.getUser();

    const url = request.nextUrl.clone();
    const isAuthPage = url.pathname === '/login' || url.pathname === '/login-master';
    const isMasterPage = url.pathname.startsWith('/admin-master');
    const isAdminPage = url.pathname.startsWith('/admin') && !isMasterPage;
    const isProPage = url.pathname.startsWith('/profissional');
    const isPaymentPage = url.pathname === '/pagamento-pendente';
    const isApprovalPage = url.pathname === '/aguardando-aprovacao';
    const isPublicPage = url.pathname === '/sistema' || url.pathname === '/login' || url.pathname === '/login-master';

    // 1. Unauthenticated users: redirect to login if they try to access protected areas
    if (!user) {
        if (isMasterPage || isAdminPage || isProPage) {
            url.pathname = '/login';
            return NextResponse.redirect(url);
        }
        return response;
    }

    // 2. Authenticated users: Fetch role and tenant status to enforce RBAC and active state
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
    const tenantData = (profile as any)?.tenant || (profile as any)?.tenants; // Handle rename/aliases if any
    // Handle array or object response (Supabase quirk)
    const tenantObj = Array.isArray(tenantData) ? tenantData[0] : tenantData;

    const isActive = tenantObj?.active !== false; // Strict check for false
    const hasPaid = tenantObj?.has_paid;
    const subscriptionPlan = tenantObj?.subscription_plan;
    const trialEndsAt = tenantObj?.trial_ends_at;

    // Access Logic Calculation
    const isUnlimited = subscriptionPlan === 'unlimited';
    const isTrialActive = subscriptionPlan === 'trial' && trialEndsAt && new Date(trialEndsAt) > new Date();

    // Grant access if: Paid OR Unlimited OR Active Trial
    const hasAccess = hasPaid || isUnlimited || isTrialActive;

    const isSuspendedPage = url.pathname === '/unidade-suspensa';

    // 3. Active check: Redirect to suspended page if the tenant is inactive
    if (role !== 'master' && !isActive && !isSuspendedPage) {
        url.pathname = '/unidade-suspensa';
        return NextResponse.redirect(url);
    }
    if (role === 'barber' && status === 'pending' && !isApprovalPage) {
        url.pathname = '/aguardando-aprovacao';
        return NextResponse.redirect(url);
    }

    // Check for pending_approval tenant status (New Admin)
    const tenantStatus = tenantObj?.status;
    if (role === 'owner' && tenantStatus === 'pending_approval' && !isApprovalPage) {
        url.pathname = '/aguardando-aprovacao';
        return NextResponse.redirect(url);
    }

    // Redirect to Payment if NO ACCESS (Logic: Not Paid AND Not Unlimited AND Not Trial)
    if (role === 'owner' && !hasAccess && !isPaymentPage && tenantStatus !== 'pending_approval') {
        url.pathname = '/pagamento-pendente';
        return NextResponse.redirect(url);
    }

    // 4. Redirect logged users away from auth pages or back to active status if they try pending pages
    if (isAuthPage || ((isPaymentPage || isApprovalPage) && ((role === 'owner' && hasPaid) || (role === 'barber' && status === 'active')))) {
        if (role === 'master') url.pathname = '/admin-master';
        else if (role === 'owner') url.pathname = '/admin';
        else url.pathname = '/profissional';
        return NextResponse.redirect(url);
    }

    // 5. Role-based restrictions
    if (isMasterPage && role !== 'master') {
        url.pathname = role === 'owner' ? '/admin' : '/profissional';
        return NextResponse.redirect(url);
    }

    if (isAdminPage && role === 'barber') {
        url.pathname = '/profissional';
        return NextResponse.redirect(url);
    }

    // Professionals (barbers) can access /profissional, Admins/Owners can access /admin and /profissional
    // Master can access everything.

    return response;
}

// Configurar em quais caminhos o Middleware deve rodar
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
