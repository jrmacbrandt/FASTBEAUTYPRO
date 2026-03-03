"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

interface PasswordResetGuardProps {
    children: React.ReactNode;
}

const PasswordResetGuard: React.FC<PasswordResetGuardProps> = ({ children }) => {
    const { profile, loading: profileLoading, theme, businessType, refreshProfile } = useProfile();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Only apply to non-masters (Owner and Barber)
    const isMaster = profile?.role === 'master' || profile?.email === 'jrmacbrandt@gmail.com';
    const needsReset = profile?.require_password_change === true && !isMaster;

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setUpdating(true);
        try {
            // 1. Update Auth Password
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (authError) throw authError;

            // 2. Update Profile Flag
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ require_password_change: false })
                .eq('id', profile?.id);

            if (profileError) throw profileError;

            // 3. Refresh profile to remove the guard
            if (refreshProfile) await refreshProfile();

            alert('Senha alterada com sucesso! Seu acesso foi liberado.');
        } catch (err: any) {
            console.error('[PasswordResetGuard] Error:', err);
            setError(err.message || 'Erro ao atualizar senha. Tente novamente.');
        } finally {
            setUpdating(false);
        }
    };

    if (profileLoading) return null;

    if (!needsReset) {
        return <>{children}</>;
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
            <div
                className="w-full max-w-md p-8 md:p-12 rounded-[2.5rem] border shadow-2xl space-y-8 animate-in zoom-in-95 duration-300"
                style={{ backgroundColor: theme.cardBg, borderColor: `${theme.primary}33` }}
            >
                <div className="text-center space-y-4">
                    <div className="size-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ color: theme.primary }}>
                        <span className="material-symbols-outlined text-5xl">lock_reset</span>
                    </div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                        Primeiro <span style={{ color: theme.primary }}>Acesso</span>
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 leading-relaxed">
                        Por segurança, você deve alterar sua senha inicial para continuar.
                    </p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-6">
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-70" style={{ color: theme.primary }}>
                            Nova Senha
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-primary transition-all"
                                placeholder="Mínimo 6 caracteres"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-70" style={{ color: theme.primary }}>
                            Confirmar Senha
                        </label>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-primary transition-all"
                            placeholder="Repita a nova senha"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={updating}
                        className="w-full font-black py-5 rounded-2xl text-lg shadow-2xl transition-all flex items-center justify-center gap-3 uppercase italic active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: theme.primary, color: businessType === 'salon' ? '#fff' : '#000' }}
                    >
                        {updating ? 'ATUALIZANDO...' : 'ALTERAR SENHA'}
                        {!updating && <span className="material-symbols-outlined">key</span>}
                    </button>
                </form>

                <div className="pt-4 text-center opacity-30 border-t border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">
                        FastBeauty Pro &copy; 2026
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PasswordResetGuard;
