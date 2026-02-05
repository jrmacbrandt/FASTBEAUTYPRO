import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// TEMPORARY: Middleware disabled due to deprecated @supabase/auth-helpers-nextjs
// Need to migrate to @supabase/ssr or implement custom auth middleware
export async function middleware(req: NextRequest) {
    // Allow all requests to proceed for now
    // TODO: Implement proper auth middleware after upgrading Supabase libraries
    return NextResponse.next();
}

// Configurar em quais caminhos o Middleware deve rodar
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
