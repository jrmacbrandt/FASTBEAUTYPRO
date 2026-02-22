


/**
 * Interface rigorosa para o status de acesso do Tenant.
 */
export interface AccessStatus {
    canAccess: boolean;
    reason: 'ok' | 'expired' | 'no_payment' | 'suspended' | 'trial_active' | 'master_override';
    redirectPath?: string;
    details?: {
        plan: string;
        trialEnds: string | null;
        hasPaid: boolean;
        active: boolean;
    };
}

/**
 * AuthGuard: Núcleo central de lógica de permissão.
 * Isolado do Next.js para facilitar testes unitários.
 */
export class AuthGuard {
    private static MASTER_EMAILS = ['jrmacbrandt@gmail.com'];

    /**
     * 🛡️ [BLINDADO] Protocolo de Manutenção - NÃO MODIFICAR
     * Verifica se o usuário é um Master Admin Supremo.
     * @param email Email do usuário
     * @param role Role vinda do JWT/Profile
     */
    static isMaster(email: string | undefined, role: string | undefined): boolean {
        // 1. Hardcoded Safety Net (Garante acesso mesmo se DB falhar)
        if (email && this.MASTER_EMAILS.includes(email)) {
            return true;
        }
        // 2. Role Check
        return role === 'master' || role === 'admin_master';
    }

    /**
     * Avalia o acesso de um Tenant.
     * Regra: Pago OU Ilimitado OU Trial Válido.
     */
    static evaluateTenantAccess(tenant: any): AccessStatus {
        if (!tenant) return { canAccess: false, reason: 'suspended', redirectPath: '/404' };

        // Normalização de dados
        const plan = tenant.subscription_plan || 'basic';
        const trialEnds = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
        const now = new Date();

        // 1. Checks de Bloqueio Explicito
        if (tenant.active === false || tenant.status === 'suspended') {
            return { canAccess: false, reason: 'suspended', redirectPath: '/bloqueado' };
        }

        // 2. Verificações Positivas
        const isUnlimited = plan === 'unlimited'; // Plano Mestre
        const hasPaid = tenant.has_paid === true; // Pagamento Confirmado
        const isTrialValid = trialEnds && trialEnds > now; // Trial em andamento
        const isActiveStatus = tenant.active === true || tenant.status === 'active'; // Aprovado pelo Admin

        // 3. Decisão Final
        if (isUnlimited) return { canAccess: true, reason: 'master_override', details: { plan, trialEnds: null, hasPaid, active: true } };

        // FIX V4.0: Se estiver ATIVO (Aprovado), libera acesso independente do pagamento.
        if (isActiveStatus) return { canAccess: true, reason: 'ok', details: { plan, trialEnds: null, hasPaid, active: true } };

        if (hasPaid) return { canAccess: true, reason: 'ok', details: { plan, trialEnds: null, hasPaid, active: true } };
        if (isTrialValid) return { canAccess: true, reason: 'trial_active', details: { plan, trialEnds: tenant.trial_ends_at, hasPaid, active: true } };

        // 4. Fallback (Expirado ou Não Pago)
        return {
            canAccess: false,
            reason: trialEnds ? 'expired' : 'no_payment',
            redirectPath: '/pagamento-pendente',
            details: { plan, trialEnds: tenant.trial_ends_at, hasPaid, active: true }
        };
    }
}
