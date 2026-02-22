
import { supabase } from './supabase';

export const LoyaltyService = {
    /**
     * Increments the loyalty stamps for a client after a service.
     */
    async addStamp(tenantId: string, clientPhone: string, serviceId?: string) {
        // 0. Fetch Tenant Settings
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('loyalty_enabled, loyalty_target')
            .eq('id', tenantId)
            .single();

        if (tenantError) {
            console.error('Error fetching tenant settings:', tenantError);
            return;
        }

        const threshold = tenant.loyalty_target || 5;

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

        // Maintenance Rule: If disabled, only update existing active cards.
        if (!tenant.loyalty_enabled) {
            if (!existing || existing.stamps_count === 0) {
                console.log('Loyalty system disabled and no active card found. Skipping stamp.');
                return;
            }
        }

        if (existing) {
            // 2. Increment (but stop at threshold if logic requires)
            // Usually, we increment even if it goes over, or we handle the prize in checkReward.
            // For 5+1 model, if it hits 5, it's ready.
            await supabase
                .from('client_loyalty')
                .update({
                    stamps_count: existing.stamps_count + 1,
                    last_stamp_at: new Date().toISOString()
                })
                .eq('id', existing.id);
        } else {
            // 3. Create new (only if enabled)
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
     * Checks if the client has a free reward available.
     */
    async checkReward(tenantId: string, clientPhone: string) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('loyalty_target')
            .eq('id', tenantId)
            .single();

        const threshold = tenant?.loyalty_target || 5;

        const { data } = await supabase
            .from('client_loyalty')
            .select('stamps_count')
            .eq('tenant_id', tenantId)
            .eq('client_phone', clientPhone)
            .maybeSingle();

        return (data?.stamps_count || 0) >= threshold;
    },

    /**
     * Redeems the reward (resets stamps or decrements).
     */
    async redeemReward(tenantId: string, clientPhone: string) {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('loyalty_target')
            .eq('id', tenantId)
            .single();

        const threshold = tenant?.loyalty_target || 5;

        const { data } = await supabase
            .from('client_loyalty')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('client_phone', clientPhone)
            .single();

        if (data && data.stamps_count >= threshold) {
            await supabase
                .from('client_loyalty')
                .update({
                    stamps_count: Math.max(0, data.stamps_count - threshold)
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
    },

    /**
     * Removes (rolls back) a loyalty stamp — used when client is marked absent or does not pay.
     */
    async removeStamp(tenantId: string, clientPhone: string) {
        const { data: existing } = await supabase
            .from('client_loyalty')
            .select('id, stamps_count')
            .eq('tenant_id', tenantId)
            .eq('client_phone', clientPhone)
            .maybeSingle();

        if (!existing || existing.stamps_count <= 0) {
            console.log('removeStamp: no stamps to remove for', clientPhone);
            return false;
        }

        await supabase
            .from('client_loyalty')
            .update({ stamps_count: Math.max(0, existing.stamps_count - 1) })
            .eq('id', existing.id);

        console.log('✅ Stamp removed for', clientPhone, '— new count:', existing.stamps_count - 1);
        return true;
    }
};
