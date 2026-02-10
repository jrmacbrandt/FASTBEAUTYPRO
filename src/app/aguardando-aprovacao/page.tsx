'use client';

import { useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AguardandoAprovacaoPage() {
    const router = useRouter();

    useLayoutEffect(() => {
        // Real-time listener for approval
        const checkStatus = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const channel = supabase
                .channel('schema-db-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${session.user.id}`
                    },
                    (payload) => {
                        if (payload.new.status === 'active') {
                            window.location.href = '/profissional';
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'tenants'
                    },
                    async (payload: any) => {
                        // Check if this update belongs to our tenant
                        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single();
                        if (payload.new.id === profile?.tenant_id && payload.new.status === 'active') {
                            window.location.href = '/admin';
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        checkStatus();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#09090b] text-center">
            <div className="max-w-md w-full bg-[#18181b] border border-white/5 rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-500">
                <div className="size-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                    <span className="material-symbols-outlined text-4xl animate-pulse">hourglass_top</span>
                </div>

                <h1 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tight">Analisando Cadastro...</h1>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                    Sua conta foi criada com sucesso e está em fila de aprovação.
                    <br /><br />
                    <strong className="text-white">Para Administradores:</strong> Aguarde a liberação do plano ou insira um cupom (se disponível).
                    <br />
                    <strong className="text-white">Para Profissionais:</strong> O dono da barbearia precisa aprovar seu acesso.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-all"
                    >
                        Verificar Novamente
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full text-red-400 hover:text-red-300 font-bold py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all"
                    >
                        Sair e Tentar Depois
                    </button>
                </div>
            </div>

            <p className="mt-8 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">FastBeauty Pro</p>
        </div>
    );
}
