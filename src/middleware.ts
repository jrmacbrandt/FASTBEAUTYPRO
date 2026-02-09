import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
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
            tenants (
                active,
                has_paid
            )
        `)
        .eq('id', user.id)
        .single();

    const role = profile?.role;
    const status = profile?.status;
    const tenantData = (profile as any)?.tenants;
    const isActive = tenantData?.active !== false; // Default to true if not found, but explicitly check false
    const hasPaid = tenantData?.has_paid;

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

    if (role === 'owner' && hasPaid === false && !isPaymentPage) {
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
