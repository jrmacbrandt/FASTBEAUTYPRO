import { supabase } from './supabase';

export interface Client {
    id: string;
    tenant_id: string;
    name: string;
    phone: string;
    birth_date?: string;
    birth_month?: number;
    metadata: Record<string, any>;
    origin_source?: string;
    last_visit?: string;
    total_spent: number;
    stamps_count?: number;
    created_at: string;
}

export interface SegmentationFilters {
    days_inactive?: number;
    min_spent?: number;
    has_tag?: string;
    birth_month?: number;
}

/**
 * Sincroniza dados do cliente a partir de um agendamento.
 * Se o cliente já existir (por telefone), atualiza a última visita.
 * Se não, cria um novo registro.
 * NOTA: Prefira usar a RPC `process_payment_and_loyalty` ao confirmar pagamento —
 * ela atualiza last_visit e total_spent atomicamente.
 */
export async function syncClientFromAppointment(
    tenantId: string,
    customerName: string,
    customerPhone: string,
    originSource?: string
) {
    if (!customerPhone) return null;

    const normalizedPhone = customerPhone.replace(/\D/g, '');

    const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('phone', normalizedPhone)
        .single();

    const now = new Date().toISOString();

    if (existingClient) {
        await supabase
            .from('clients')
            .update({ last_visit: now, name: customerName })
            .eq('id', existingClient.id);
        return existingClient.id;
    } else {
        const { data: newClient, error: insertError } = await supabase
            .from('clients')
            .insert({
                tenant_id: tenantId,
                name: customerName,
                phone: normalizedPhone,
                origin_source: originSource || 'Direct',
                last_visit: now,
                metadata: {},
                total_spent: 0
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('Error creating client:', insertError);
            return null;
        }
        return newClient?.id;
    }
}

// ─────────────────────────────────────────────────────────────────
//  SEGMENTAÇÃO VIA RPC (banco de dados — escala corretamente)
// ─────────────────────────────────────────────────────────────────

/**
 * Filtro 1 — Base total de clientes, paginada.
 */
export async function getAllClients(
    tenantId: string,
    page = 0,
    pageSize = 50
): Promise<{ clients: Client[]; totalCount: number }> {
    const { data, error } = await supabase.rpc('get_crm_clients', {
        p_tenant_id: tenantId,
        p_page: page,
        p_page_size: pageSize,
    });

    if (error) { console.error('getAllClients error:', error); throw error; }

    const clients = (data || []) as Client[];
    const totalCount = clients.length > 0 ? Number((data as any)[0]?.total_count ?? clients.length) : 0;
    return { clients, totalCount };
}

/**
 * Filtro 2 — Aniversariantes do mês (null = mês atual).
 */
export async function getBirthdayClients(
    tenantId: string,
    month?: number
): Promise<Client[]> {
    const { data, error } = await supabase.rpc('get_birthday_clients', {
        p_tenant_id: tenantId,
        p_month: month ?? null,
    });

    if (error) { console.error('getBirthdayClients error:', error); throw error; }
    return (data || []) as Client[];
}

/**
 * Filtro 3 — Risco de Evasão (Churn Risk). Usa crm_churn_days do tenant.
 */
export async function getChurnRiskClients(
    tenantId: string,
    days?: number
): Promise<(Client & { days_inactive: number })[]> {
    const { data, error } = await supabase.rpc('get_churn_risk_clients', {
        p_tenant_id: tenantId,
        p_days: days ?? null,
    });

    if (error) { console.error('getChurnRiskClients error:', error); throw error; }
    return (data || []) as (Client & { days_inactive: number })[];
}

/**
 * Filtro 4 — Clientes VIP: top 20% ou acima do threshold.
 */
export async function getVipClients(
    tenantId: string,
    threshold?: number
): Promise<(Client & { vip_rank: number })[]> {
    const { data, error } = await supabase.rpc('get_vip_clients', {
        p_tenant_id: tenantId,
        p_threshold: threshold ?? null,
    });

    if (error) { console.error('getVipClients error:', error); throw error; }
    return (data || []) as (Client & { vip_rank: number })[];
}

/**
 * @deprecated Use getAllClients / getBirthdayClients / getChurnRiskClients / getVipClients.
 * Mantido para compatibilidade com código legado do CRM modal.
 */
export async function getSegmentedClients(tenantId: string, filters: SegmentationFilters): Promise<Client[]> {
    if (filters.birth_month) {
        return getBirthdayClients(tenantId, filters.birth_month);
    }
    if (filters.days_inactive) {
        return getChurnRiskClients(tenantId, filters.days_inactive);
    }
    if (filters.min_spent) {
        return getVipClients(tenantId, filters.min_spent);
    }
    const { clients } = await getAllClients(tenantId);
    return clients;
}

/**
 * @deprecated A RPC process_payment_and_loyalty já atualiza total_spent atomicamente.
 * Mantido para compatibilidade.
 */
export async function updateClientLTV(clientId: string, amount: number) {
    const { data: client } = await supabase
        .from('clients')
        .select('total_spent')
        .eq('id', clientId)
        .single();

    if (client) {
        const newTotal = (Number(client.total_spent) || 0) + amount;
        await supabase
            .from('clients')
            .update({ total_spent: newTotal })
            .eq('id', clientId);
    }
}
