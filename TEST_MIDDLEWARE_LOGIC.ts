
/**
 * TEST_MIDDLEWARE_LOGIC.ts
 * Simulador de Lógica de Acesso (Middleware Audit)
 * 
 * Este script replica EXATAMENTE a lógica implementada no middleware.ts
 * para validar todos os cenários de acesso possíveis.
 */

type UserProfile = {
    role: 'owner' | 'barber' | 'master';
    status: 'active' | 'pending' | 'suspended';
    tenant: {
        active: boolean;
        has_paid: boolean;
        status: string;
        subscription_plan: 'unlimited' | 'trial' | null;
        trial_ends_at: string | null;
    }
};

function checkAccess(profile: UserProfile, path: string): string {
    const role = profile.role;
    const status = profile.status; // Profile status (barber pending etc)
    const tenantObj = profile.tenant;

    const isActive = tenantObj?.active !== false;
    const hasPaid = tenantObj?.has_paid;
    const subscriptionPlan = tenantObj?.subscription_plan;
    const trialEndsAt = tenantObj?.trial_ends_at;

    // --- LÓGICA DO MIDDLEWARE (CÓPIA FIEL) ---

    // Access Logic Calculation
    const isUnlimited = subscriptionPlan === 'unlimited';
    const isTrialActive = subscriptionPlan === 'trial' && trialEndsAt && new Date(trialEndsAt) > new Date();

    // Grant access if: Paid OR Unlimited OR Active Trial
    const hasAccess = hasPaid || isUnlimited || isTrialActive;

    const isSuspendedPage = path === '/unidade-suspensa';
    const isApprovalPage = path === '/aguardando-aprovacao';
    const isPaymentPage = path === '/pagamento-pendente';

    // 3. Active check
    if (role !== 'master' && !isActive && !isSuspendedPage) {
        return 'REDIRECT: /unidade-suspensa';
    }

    // Barber Pending
    if (role === 'barber' && status === 'pending' && !isApprovalPage) {
        return 'REDIRECT: /aguardando-aprovacao';
    }

    // Owner Pending Approval
    const tenantStatus = tenantObj?.status;
    if (role === 'owner' && tenantStatus === 'pending_approval' && !isApprovalPage) {
        return 'REDIRECT: /aguardando-aprovacao';
    }

    // Payment / Access Check
    if (role === 'owner' && !hasAccess && !isPaymentPage && tenantStatus !== 'pending_approval') {
        return 'REDIRECT: /pagamento-pendente';
    }

    return 'ACCESS GRANTED';
}

// --- CENÁRIOS DE TESTE ---
const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

const scenarios = [
    {
        name: '1. Dono Pago (Normal)',
        profile: { role: 'owner', status: 'active', tenant: { active: true, has_paid: true, status: 'active', subscription_plan: null, trial_ends_at: null } },
        expected: 'ACCESS GRANTED'
    },
    {
        name: '2. Dono NÃO Pago, mas ILIMITADO (Cupom Master)',
        profile: { role: 'owner', status: 'active', tenant: { active: true, has_paid: false, status: 'active', subscription_plan: 'unlimited', trial_ends_at: null } },
        expected: 'ACCESS GRANTED'
    },
    {
        name: '3. Dono NÃO Pago, Trial ATIVO',
        profile: { role: 'owner', status: 'active', tenant: { active: true, has_paid: false, status: 'active', subscription_plan: 'trial', trial_ends_at: tomorrow.toISOString() } },
        expected: 'ACCESS GRANTED'
    },
    {
        name: '4. Dono NÃO Pago, Trial VENCIDO',
        profile: { role: 'owner', status: 'active', tenant: { active: true, has_paid: false, status: 'active', subscription_plan: 'trial', trial_ends_at: yesterday.toISOString() } },
        expected: 'REDIRECT: /pagamento-pendente'
    },
    {
        name: '5. Dono NÃO Pago, Sem Plano',
        profile: { role: 'owner', status: 'active', tenant: { active: true, has_paid: false, status: 'active', subscription_plan: null, trial_ends_at: null } },
        expected: 'REDIRECT: /pagamento-pendente'
    },
    {
        name: '6. Unidade Suspensa (Inadimplente ou Bloqueado)',
        profile: { role: 'owner', status: 'active', tenant: { active: false, has_paid: true, status: 'active', subscription_plan: null, trial_ends_at: null } },
        expected: 'REDIRECT: /unidade-suspensa'
    },
    {
        name: '7. Novo Dono (Pending Approval)',
        profile: { role: 'owner', status: 'active', tenant: { active: true, has_paid: false, status: 'pending_approval', subscription_plan: null, trial_ends_at: null } },
        expected: 'REDIRECT: /aguardando-aprovacao'
    }
];

console.log('--- RELATÓRIO DE AUDITORIA DE ACESSO ---\n');

let passed = 0;
scenarios.forEach(cenario => {
    const result = checkAccess(cenario.profile as UserProfile, '/admin');
    const isPass = result === cenario.expected;

    if (isPass) passed++;

    console.log(`[${isPass ? 'OK' : 'FAIL'}] ${cenario.name}`);
    if (!isPass) {
        console.log(`   Esperado: ${cenario.expected}`);
        console.log(`   Obtido:   ${result}`);
    }
});

console.log(`\nRESULTADO: ${passed}/${scenarios.length} testes passaram.`);
