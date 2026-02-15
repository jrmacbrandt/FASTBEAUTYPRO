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
    const isMaintenancePage = url.pathname === '/manutencao';

    // 1.5 Handle Impersonation (Support Mode)
    const impersonateId = url.searchParams.get('impersonate');
    const stopImpersonate = url.searchParams.has('stop_impersonate');

    // Get existing support cookie
    const supportTenantId = request.cookies.get('support_tenant_id')?.value;

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
            id,
            role, 
            status, 
            tenant_id,
            tenant (
                id,
                active,
                has_paid,
                status,
                subscription_plan,
                trial_ends_at,
                maintenance_mode
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

        // Support Mode Logic
        if (impersonateId) {
            console.log('🛡️ MASTER: Starting impersonation for', impersonateId);
            // AUTO-LOCK: Block others when master enters
            const { error: lockError } = await supabase
                .from('tenants')
                .update({ maintenance_mode: true })
                .eq('id', impersonateId);

            if (lockError) console.error('❌ Failed to lock tenant:', lockError);

            const response = NextResponse.redirect(new URL('/admin', request.url));
            response.cookies.set('support_tenant_id', impersonateId, { path: '/', maxAge: 60 * 60 * 4 }); // 4 hours
            return response;
        }

        if (stopImpersonate) {
            console.log('🛡️ MASTER: Stopping impersonation');
            // AUTO-UNLOCK: Restore access when master leaves
            const currentSupportId = request.cookies.get('support_tenant_id')?.value;
            if (currentSupportId) {
                const { error: unlockError } = await supabase
                    .from('tenants')
                    .update({ maintenance_mode: false })
                    .eq('id', currentSupportId);

                if (unlockError) console.error('❌ Failed to unlock tenant:', unlockError);
            }

            const response = NextResponse.redirect(new URL('/admin-master', request.url));
            response.cookies.delete('support_tenant_id');
            response.headers.append('Set-Cookie', 'support_tenant_id=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
            return response;
        }
    }

    const isSuspendedPage = url.pathname === '/unidade-suspensa';

    // ----------------------------------------------------------------
    // NEW STRICT LOGIC (USER DEFINED V4.0) + MAINTENANCE (V5.0)
    // ----------------------------------------------------------------

    // 🚀 CRITICAL MAINTENANCE LOCKOUT (V10.0)
    // 🚀 CRITICAL MAINTENANCE LOCKOUT (V12.0 - Strict Master Only)
    // Rule: Every non-master is blocked if tenant is in maintenance.
    // Owners (Real Admins) MUST be blocked during maintenance per audit request.
    if (role !== 'master' && (isAdminPage || isProPage || isMaintenancePage)) {
        const tid = profile?.tenant_id;
        if (tid) {
            const { data: dbTenant } = await supabase
                .from('tenants')
                .select('maintenance_mode')
                .eq('id', tid)
                .single();

            if (dbTenant?.maintenance_mode && !isMaintenancePage) {
                console.log('🚪 LOCKOUT: Maintenance active. Blocking access.');
                return NextResponse.redirect(new URL('/manutencao', request.url));
            }

            if (!dbTenant?.maintenance_mode && isMaintenancePage) {
                console.log('🚪 UNLOCK: Maintenance over. Returning home.');
                const homeUrl = role === 'owner' ? '/admin' : (role === 'barber' ? '/profissional' : '/');
                return NextResponse.redirect(new URL(homeUrl, request.url));
            }
        }
    }

    // 1. MASTER Logic
    // Only jrmacbrandt@gmail.com (Whitelisted) access /admin-master. 
    // Already handled by Role Override above then Routing below.

    // 2. OWNER Logic (Admin)
    // Rule: IF Approved (Active) -> Admin Panel.
    //       IF NOT Approved -> Payment/Coupon Screen.
    if (role === 'owner') {
        // A. Suspended Check (Priority 1)
        if (tenantObj?.status === 'suspended' && !isSuspendedPage) {
            url.pathname = '/unidade-suspensa';
            return NextResponse.redirect(url);
        }

        // B. Approval Check
        // "SE SIM [APROVADO] --- PAINEL ADMINISTRATIVO DA LOJA"
        // "SE NÃO --- TELA DE PAGAMENTO OU CODIGO CUPOM"

        // Fix: Check both Boolean 'active' and String 'status' to avoid data inconsistency gaps.
        // User reports "Approved" (Status: Ativo) but middleware was blocking.
        const isStatusActive = tenantObj?.status === 'active';
        const isApproved = isActive || isStatusActive;

        if (!isApproved && !isPaymentPage && !isSuspendedPage) {
            // Not Approved? -> Payment/Coupon
            url.pathname = '/pagamento-pendente';
            return NextResponse.redirect(url);
        }

        // If Approved? -> Allow flow to proceed (will hit routing check below)
    }

    // 3. PROFESSIONAL Logic
    // Rule: IF Approved (Active) -> Pro Panel.
    //       IF NOT Approved -> Waiting Approval.
    if (role === 'barber') {
        // A. Approval Check
        // "SE APROVADO PELO ADMINISTRADOR DA LOJA--SEU PAINEL PROFISSIONAL"
        // "SE NÃO --- TELA DE AGUARDANDO APROVAÇÃO"

        const isProApproved = status === 'active';

        if (!isProApproved && !isApprovalPage) {
            url.pathname = '/aguardando-aprovacao';
            return NextResponse.redirect(url);
        }
    }

    // ----------------------------------------------------------------
    // ROUTING & REDIRECTION (KEEP USERS IN THEIR LANE)
    // ----------------------------------------------------------------

    // Redirect logged users from auth/pending pages if they are now VALID
    const isValidMaster = role === 'master';

    // Fix: Valid Owner = Active Boolean OR Active String
    const isValidOwner = role === 'owner' && (isActive || tenantObj?.status === 'active');

    const isValidPro = role === 'barber' && status === 'active';

    // If on a "Gatekeeper" page but already have access, send Home.
    if (isAuthPage || isPaymentPage || isApprovalPage) {
        if (isValidMaster) {
            url.pathname = '/admin-master';
            return NextResponse.redirect(url);
        }
        if (isValidOwner) {
            // Fix: Owners was going to Payment/Approval incorrectly.
            url.pathname = '/admin';
            return NextResponse.redirect(url);
        }
        if (isValidPro) {
            url.pathname = '/profissional';
            return NextResponse.redirect(url);
        }
    }

    // STRICT AREA PROTECTION

    // 1. Master trying to go elsewhere? (Optional, usually Master can roam, but let's stick to panel)
    if (role === 'master' && !isMasterPage) {
        // Allow Master to view other pages? User said "Direcionado para sua respectiva area".
        // Let's force Master to /admin-master unless explicitly inspecting?
        // For now, let's just protect the other areas FROM non-masters.
    }

    // 2. Owner trying to access Master Area
    if (role === 'owner' && isMasterPage) {
        url.pathname = '/admin';
        return NextResponse.redirect(url);
    }

    // 3. Pro trying to access Admin/Master
    if (role === 'barber' && (isAdminPage || isMasterPage)) {
        url.pathname = '/profissional';
        return NextResponse.redirect(url);
    }

    // 4. Impersonation Allow
    if (role === 'master' && isAdminPage && supportTenantId) {
        return supabaseResponse;
    }

    return supabaseResponse;
}

// Configurar em quais caminhos o Middleware deve rodar
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
