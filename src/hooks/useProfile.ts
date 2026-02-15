"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

export function useProfile() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function getProfile() {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*, tenant(*)')
                    .eq('id', session.user.id)
                    .single();

                if (!error && data) {
                    let finalProfile = { ...data };

                    // 🛡️ Master Impersonation Logic (V12.0)
                    if (data.role === 'master' || data.role === 'admin_master' || data.email === 'jrmacbrandt@gmail.com') {
                        const cookies = document.cookie.split('; ');
                        const supportId = cookies.find(row => row.trim().startsWith('support_tenant_id='))?.split('=')[1];

                        if (supportId) {
                            console.log('🛡️ SUPPORT MODE ACTIVE: Effective Tenant', supportId);
                            const { data: impTenant } = await supabase
                                .from('tenants')
                                .select('*')
                                .eq('id', supportId)
                                .single();

                            if (impTenant) {
                                finalProfile.tenant_id = supportId;
                                finalProfile.tenant = impTenant;
                                // Visual Override: Show Tenant Name even for Master
                                finalProfile.full_name = `MODO SUPORTE: ${impTenant.name || 'Unidade'}`;
                                // Force role to owner during impersonation for UI logic
                                finalProfile.role = 'owner';
                            }
                        }
                    }

                    setProfile(finalProfile as any);
                }
            }
            setLoading(false);
        }

        getProfile();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            getProfile();
        });

        return () => subscription.unsubscribe();
    }, []);

    return {
        profile,
        loading,
        businessType: profile?.tenant?.business_type === 'salon' ? 'salon' : 'barber'
    };
}
