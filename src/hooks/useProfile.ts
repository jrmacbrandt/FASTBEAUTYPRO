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

                    // Impersonation Logic for Master Admin
                    if (data.role === 'master' || data.email === 'jrmacbrandt@gmail.com') {
                        const supportId = document.cookie
                            .split('; ')
                            .find(row => row.startsWith('support_tenant_id='))
                            ?.split('=')[1];

                        if (supportId) {
                            console.log('🛡️ SUPPORT MODE ACTIVE: Impersonating tenant', supportId);
                            finalProfile.tenant_id = supportId;
                            // Optionally fetch the impersonated tenant data
                            const { data: impersonatedTenant } = await supabase
                                .from('tenants')
                                .select('*')
                                .eq('id', supportId)
                                .single();
                            if (impersonatedTenant) {
                                finalProfile.tenant = impersonatedTenant;
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

    return { profile, loading };
}
