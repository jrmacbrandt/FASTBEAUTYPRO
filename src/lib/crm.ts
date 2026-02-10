import { supabase } from './supabase';

export interface Client {
    id: string;
    tenant_id: string;
    name: string;
    phone: string;
    birth_date?: string;
    metadata: Record<string, any>;
    origin_source?: string;
    last_visit?: string;
    total_spent: number;
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
 */
export async function syncClientFromAppointment(
    tenantId: string,
    customerName: string,
    customerPhone: string,
    originSource?: string
) {
    if (!customerPhone) return null;

    // Normalizar telefone (apenas números)
    const normalizedPhone = customerPhone.replace(/\D/g, '');

    // 1. Tentar encontrar cliente existente
    const { data: existingClient, error: fetchError } = await supabase
        .from('clients')
        .select('id, metadata, total_spent')
        .eq('tenant_id', tenantId)
        .eq('phone', normalizedPhone)
        .single();

    const now = new Date().toISOString();

    if (existingClient) {
        // Atualizar última visita
        const { error: updateError } = await supabase
            .from('clients')
            .update({
                last_visit: now,
                name: customerName, // Atualiza nome caso tenha mudado
            })
            .eq('id', existingClient.id);

        if (updateError) console.error('Error updating client:', updateError);
        return existingClient.id;
    } else {
        // Criar novo cliente
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

/**
 * Busca clientes segmentados com base em filtros.
 * Usado pelo Motor de Campanhas.
 */
export async function getSegmentedClients(tenantId: string, filters: SegmentationFilters) {
    let query = supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId);

    // Filtro: Inatividade (Churn Risk)
    if (filters.days_inactive) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - filters.days_inactive);
        query = query.lt('last_visit', dateLimit.toISOString());
    }

    // Filtro: Gasto Mínimo (VIP)
    if (filters.min_spent) {
        query = query.gte('total_spent', filters.min_spent);
    }

    // Filtro: Aniversariantes do Mês
    if (filters.birth_month) {
        // Nota: Filtrar por mês em campo DATE no Supabase requer function ou range query.
        // Solução simples via client-side para MVP ou raw SQL se permitido.
        // Vamos usar uma abordagem mista: trazer dados e filtrar aqui se a base for pequena (<10k),
        // ou a melhor prática: criar uma View ou RPC. Para MVP v4.0, vamos assumir load aceitável.
        // TODO: Mover para RPC 'get_birthdays' em v4.1 se escalar.
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching segmented clients:', error);
        throw error;
    }

    // Filtro extra de memória para casos complexos não suportados diretamente na API simples
    let result = data as Client[];

    if (filters.birth_month) {
        result = result.filter(c => {
            if (!c.birth_date) return false;
            const month = new Date(c.birth_date).getMonth() + 1; // 0-indexed
            return month === filters.birth_month;
        });
    }

    return result;
}

/**
 * Atualiza o LTV do cliente após fechar uma comanda.
 */
export async function updateClientLTV(clientId: string, amount: number) {
    // RPC seria ideal para atomic update, mas vamos de read-write para MVP
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
