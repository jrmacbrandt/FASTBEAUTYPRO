"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

export function useProfile() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refreshProfile = () => setRefreshTrigger(prev => prev + 1);

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

            // Buscar perfil primeiro
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profileError) {
                console.error('❌ [useProfile] Erro ao buscar perfil:', profileError.message);
                console.error('❌ [useProfile] Detalhes do erro:', profileError);
                setLoading(false);
                return;
            }

            if (!profileData) {
                console.warn('⚠️ [useProfile] Perfil não encontrado para user_id:', session.user.id);
                setLoading(false);
                return;
            }

            // Agora buscar o tenant separadamente se tenant_id existir
            let tenantData = null;
            if (profileData.tenant_id) {
                const { data: tenant, error: tenantError } = await supabase
                    .from('tenants')
                    .select('*')
                    .eq('id', profileData.tenant_id)
                    .single();

                if (tenantError) {
                    console.error('❌ [useProfile] Erro ao buscar tenant:', tenantError.message);
                } else {
                    tenantData = tenant;
                }
            }

            // Combinar os dados
            const data = { ...profileData, tenant: tenantData };

            console.log('✅ [useProfile] Perfil carregado:', {
                id: data.id,
                email: data.email,
                role: data.role,
                tenant_id: data.tenant_id,
                tenant_name: data.tenant?.name
            });

            let finalProfile = { ...data };

            // 🛡️ [BLINDADO] Protocolo de Manutenção - NÃO MODIFICAR
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
    }, [refreshTrigger]);

    // THEME SYNC FIX: Enforce Dark Mode
    const storedType = typeof window !== 'undefined' ? localStorage.getItem('elite_business_type') : null;

    const businessType = (storedType === 'salon' || storedType === 'barber'
        ? storedType
        : (profile?.tenant?.business_type === 'salon' ? 'salon' : 'barber')) as 'barber' | 'salon';

    const isSalon = businessType === 'salon';

    const theme = {
        primary: isSalon ? '#7b438e' : '#f2b90d',
        bg: '#000000',
        text: '#f8fafc',
        textMuted: '#64748b',
        cardBg: '#121214',
        border: '#ffffff0d',
        secondaryBg: '#18181b',
        chartGrid: '#27272a',
        chartStroke: '#52525b',
        sidebarBg: '#121214',
        headerBg: '#121214',
        mode: 'dark'
    };

    return {
        profile,
        loading,
        businessType,
        themeMode: 'dark',
        theme,
        refreshProfile
    };
}
