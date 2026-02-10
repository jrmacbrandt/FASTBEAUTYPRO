
import { supabase } from './supabase';

export const LoyaltyService = {
    /**
     * Increments the loyalty stamps for a client after a service.
     */
    async addStamp(tenantId: string, clientPhone: string, serviceId?: string) {
        // 1. Check if loyalty record exists
        const { data: existing, error } = await supabase
            .from('client_loyalty')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('client_phone', clientPhone)
            .maybeSingle();

        if (error) {
            console.error('Error fetching loyalty:', error);
            return;
        }

        if (existing) {
            // 2. Increment
            await supabase
                .from('client_loyalty')
                .update({
                    stamps_count: existing.stamps_count + 1,
                    last_stamp_at: new Date().toISOString()
                })
                .eq('id', existing.id);
        } else {
            // 3. Create new
            await supabase
                .from('client_loyalty')
                .insert({
                    tenant_id: tenantId,
                    client_phone: clientPhone,
                    service_id: serviceId,
                    stamps_count: 1,
                    last_stamp_at: new Date().toISOString()
                });
        }
    },

    /**
     * Checks if the client has a free reward available (>= 5 stamps).
     */
    async checkReward(tenantId: string, clientPhone: string) {
        const { data } = await supabase
            .from('client_loyalty')
            .select('stamps_count')
            .eq('tenant_id', tenantId)
            .eq('client_phone', clientPhone)
            .maybeSingle();

        return (data?.stamps_count || 0) >= 5;
    },

    /**
     * Redeems the reward (resets stamps or decrements).
     * For 5+1 model: deduct 5 stamps.
     */
    async redeemReward(tenantId: string, clientPhone: string) {
        const { data } = await supabase
            .from('client_loyalty')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('client_phone', clientPhone)
            .single();

        if (data && data.stamps_count >= 5) {
            await supabase
                .from('client_loyalty')
                .update({
                    stamps_count: data.stamps_count - 5
                })
                .eq('id', data.id);
            return true;
        }
        return false;
    },

    /**
     * Checks for active VIP subscription.
     */
    async checkSubscription(tenantId: string, clientPhone: string) {
        if (!clientPhone) return null;

        // Normalize phone (simple check)
        const phone = clientPhone.replace(/\D/g, '');

        const { data } = await supabase
            .from('client_subscriptions')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('status', 'ATIVO') // Ensure status column is checked
            .ilike('client_phone', `%${phone}%`) // Loose match for MVP
            .maybeSingle();

        return data;
    }
};
