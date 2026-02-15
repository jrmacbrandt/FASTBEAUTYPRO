"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

export function useProfile() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function getProfile() {
            console.log('🔍 [useProfile] Iniciando carregamento do perfil...');
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                console.warn('⚠️ [useProfile] Nenhuma sessão ativa encontrada');
                setLoading(false);
                return;
            }

            console.log('✅ [useProfile] Sessão ativa:', session.user.email);

            const { data, error } = await supabase
                .from('profiles')
                .select('*, tenant(*)')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error('❌ [useProfile] Erro ao buscar perfil:', error.message);
                console.error('❌ [useProfile] Detalhes do erro:', error);
                setLoading(false);
                return;
            }

            if (!data) {
                console.warn('⚠️ [useProfile] Perfil não encontrado para user_id:', session.user.id);
                setLoading(false);
                return;
            }

            console.log('✅ [useProfile] Perfil carregado:', {
                id: data.id,
                email: data.email,
                role: data.role,
                tenant_id: data.tenant_id,
                tenant_name: data.tenant?.name
            });

            let finalProfile = { ...data };

            // 🛡️ Master Impersonation Logic (V12.0)
            if (data.role === 'master' || data.role === 'admin_master' || data.email === 'jrmacbrandt@gmail.com') {
                const cookies = document.cookie.split('; ');
                const supportId = cookies.find(row => row.trim().startsWith('support_tenant_id='))?.split('=')[1];

                if (supportId) {
                    console.log('🛡️ [useProfile] MODO SUPORTE ATIVO - Tenant:', supportId);
                    const { data: impTenant, error: impError } = await supabase
                        .from('tenants')
                        .select('*')
                        .eq('id', supportId)
                        .single();

                    if (impError) {
                        console.error('❌ [useProfile] Erro ao buscar tenant de suporte:', impError);
                    } else if (impTenant) {
                        console.log('✅ [useProfile] Tenant de suporte carregado:', impTenant.name);
                        finalProfile.tenant_id = supportId;
                        finalProfile.tenant = impTenant;
                        finalProfile.full_name = `MODO SUPORTE: ${impTenant.name || 'Unidade'}`;
                        finalProfile.role = 'owner';
                    }
                }
            }

            console.log('✅ [useProfile] Perfil final configurado:', {
                role: finalProfile.role,
                tenant_id: finalProfile.tenant_id,
                tenant_name: finalProfile.tenant?.name
            });

            setProfile(finalProfile as any);
            setLoading(false);
        }

        getProfile();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            console.log('🔄 [useProfile] Auth state changed, recarregando perfil...');
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
