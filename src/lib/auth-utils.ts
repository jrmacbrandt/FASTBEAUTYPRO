import { supabase } from './supabase';

export async function getEffectiveTenantId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Check for impersonation cookie
    const cookies = typeof document !== 'undefined' ? document.cookie.split('; ') : [];
    const supportId = cookies.find(row => row.trim().startsWith('support_tenant_id='))?.split('=')[1];

    if (supportId) {
        // Double check if the user is a Master (security)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, email')
            .eq('id', session.user.id)
            .single();

        const isMaster = profile?.role === 'master' ||
            profile?.role === 'admin_master' ||
            ['jrmacbrandt@gmail.com'].includes(profile?.email || '');

        if (isMaster) return supportId;
    }

    // Default to the user's own tenant
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

    return profile?.tenant_id || null;
}
