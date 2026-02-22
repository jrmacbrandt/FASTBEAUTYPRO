
import { supabase } from './supabase';

// Return type for addStamp — used by callers to show reward feedback
export type StampResult = {
    stampAdded: boolean;
    rewardEarned: boolean; // true when this stamp completed the cycle
    newStampsCount: number;
};

export const LoyaltyService = {
    /**
     * Adds a confirmed loyalty stamp after a paid service.
     * - Uses loyalty_target_locked (the meta locked at cycle start) for goal checks.
     * - When the goal is reached: resets stamps to 0, updates loyalty_target_locked
     *   to the current tenant value (new cycle follows new rule — Regra #4 & #5).
     * - Returns { stampAdded, rewardEarned, newStampsCount } for UI feedback.
     */
    async addStamp(tenantId: string, clientPhone: string, serviceId?: string): Promise<StampResult> {
        // 0. Fetch Tenant Settings
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('loyalty_enabled, loyalty_target')
            .eq('id', tenantId)
            .single();

        if (tenantError || !tenant) {
            console.error('Error fetching tenant settings:', tenantError);
            return { stampAdded: false, rewardEarned: false, newStampsCount: 0 };
        }

        const currentTarget = tenant.loyalty_target || 5;

        // 1. Check existing loyalty record
        const { data: existing, error } = await supabase
            .from('client_loyalty')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('client_phone', clientPhone)
            .maybeSingle();

        if (error) {
            console.error('Error fetching loyalty:', error);
            return { stampAdded: false, rewardEarned: false, newStampsCount: 0 };
        }

        // Maintenance Rule: If disabled, only update existing active cards.
        if (!tenant.loyalty_enabled) {
            if (!existing || existing.stamps_count === 0) {
                console.log('Loyalty disabled and no active card. Skipping stamp.');
                return { stampAdded: false, rewardEarned: false, newStampsCount: 0 };
            }
        }

        if (existing) {
            // Determine which target governs this cycle (Regra #5: grandfathering)
            const cycleTarget = existing.loyalty_target_locked || currentTarget;
            const newCount = existing.stamps_count + 1;

            if (newCount >= cycleTarget) {
                // 🎉 REWARD EARNED — reset the card and start new cycle with NEW target
                const remainder = Math.max(0, newCount - cycleTarget);
                await supabase
                    .from('client_loyalty')
                    .update({
                        stamps_count: remainder,
                        last_stamp_at: new Date().toISOString(),
                        loyalty_target_locked: currentTarget // new cycle uses admin's current setting
                    })
                    .eq('id', existing.id);

                console.log(`🎉 Reward earned for ${clientPhone}! Cycle reset. New target: ${currentTarget}`);
                return { stampAdded: true, rewardEarned: true, newStampsCount: remainder };
            } else {
                // Normal increment
                await supabase
                    .from('client_loyalty')
                    .update({
                        stamps_count: newCount,
                        last_stamp_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);

                return { stampAdded: true, rewardEarned: false, newStampsCount: newCount };
            }
        } else {
            // 2. Create new record — locks the current target as the cycle target
            await supabase
                .from('client_loyalty')
                .insert({
                    tenant_id: tenantId,
                    client_phone: clientPhone,
                    service_id: serviceId,
                    stamps_count: 1,
                    last_stamp_at: new Date().toISOString(),
                    loyalty_target_locked: currentTarget
                });

            return { stampAdded: true, rewardEarned: false, newStampsCount: 1 };
        }
    },

    /**
     * Checks if the client has a free reward available.
     * Uses loyalty_target_locked (cycle-specific target) — not the tenant's current setting.
     */
    async checkReward(tenantId: string, clientPhone: string): Promise<boolean> {
        const { data } = await supabase
            .from('client_loyalty')
            .select('stamps_count, loyalty_target_locked')
            .eq('tenant_id', tenantId)
            .eq('client_phone', clientPhone)
            .maybeSingle();

        if (!data) return false;

        // Fallback to tenant current target if column not yet backfilled
        let cycleTarget = data.loyalty_target_locked;
        if (!cycleTarget) {
            const { data: tenant } = await supabase
                .from('tenants')
                .select('loyalty_target')
                .eq('id', tenantId)
                .single();
            cycleTarget = tenant?.loyalty_target || 5;
        }

        return (data.stamps_count || 0) >= cycleTarget;
    },

    /**
     * @deprecated — Reset logic is now handled internally by addStamp().
     * Kept for backwards compatibility with caixa/page.tsx manual redemption.
     */
    async redeemReward(tenantId: string, clientPhone: string): Promise<boolean> {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('loyalty_target')
            .eq('id', tenantId)
            .single();

        const currentTarget = tenant?.loyalty_target || 5;

        const { data } = await supabase
            .from('client_loyalty')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('client_phone', clientPhone)
            .single();

        if (!data) return false;

        const cycleTarget = data.loyalty_target_locked || currentTarget;

        if (data.stamps_count >= cycleTarget) {
            const remainder = Math.max(0, data.stamps_count - cycleTarget);
            await supabase
                .from('client_loyalty')
                .update({
                    stamps_count: remainder,
                    loyalty_target_locked: currentTarget // new cycle uses new target
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

        const phone = clientPhone.replace(/\D/g, '');

        const { data } = await supabase
            .from('client_subscriptions')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('status', 'ATIVO')
            .ilike('client_phone', `%${phone}%`)
            .maybeSingle();

        return data;
    },

    /**
     * Removes (rolls back) a loyalty stamp — used when client is marked absent or does not pay.
     */
    async removeStamp(tenantId: string, clientPhone: string): Promise<boolean> {
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
