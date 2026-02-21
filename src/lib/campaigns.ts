import { supabase } from './supabase';
import { getSegmentedClients, SegmentationFilters } from './crm';
import { Client } from './crm';

export interface Campaign {
    id: string;
    tenant_id: string;
    name: string;
    filters: SegmentationFilters;
    message_template: string;
    status: 'DRAFT' | 'PROCESSED' | 'COMPLETED';
    created_at: string;
}

export interface CampaignItem {
    id: string;
    campaign_id: string;
    client_name: string;
    client_phone: string;
    generated_url: string;
    status: 'PENDING' | 'SENT' | 'CLICKED';
}

/**
 * Cria uma nova campanha e gera a fila de envio (Batch).
 */
export async function createPayloadCampaign(
    tenantId: string,
    name: string,
    filters: SegmentationFilters,
    messageTemplate: string
) {
    // 1. Criar registro da campanha
    const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
            tenant_id: tenantId,
            name,
            filters,
            message_template: messageTemplate,
            status: 'PROCESSED' // Já vamos processar direto no MVP
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    // 2. Buscar clientes alvo
    const targetClients = await getSegmentedClients(tenantId, filters);

    // 3. Gerar itens da campanha
    const items = targetClients.map((client: Client) => {
        const url = generateWhatsAppLink(client.phone, messageTemplate, client.name);
        return {
            campaign_id: campaign.id,
            client_name: client.name,
            client_phone: client.phone,
            generated_url: url,
            status: 'PENDING'
        };
    });

    if (items.length > 0) {
        const { error: itemsError } = await supabase
            .from('campaign_items')
            .insert(items);

        if (itemsError) throw itemsError;
    }

    return { campaign, count: items.length };
}

import { WhatsAppService } from './whatsapp';
// ... rest of imports

// ... rest of interfaces

/**
 * Gera o link `wa.me` com mensagem codificada.
 */
export function generateWhatsAppLink(phone: string, template: string, clientName: string) {
    // Substituir variáveis
    const message = template.replace('{name}', clientName.split(' ')[0]);
    return WhatsAppService.generateLink(phone, message);
}
