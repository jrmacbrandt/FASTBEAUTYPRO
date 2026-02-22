-- Migration: Add loyalty_target_locked column
-- This column stores the loyalty target that was in effect when the client started their current cycle.
-- It guarantees that clients already mid-cycle are not affected by admin changes to loyalty_target.
-- A new cycle (after reset) will use the then-current loyalty_target from the tenant.

ALTER TABLE public.client_loyalty
ADD COLUMN IF NOT EXISTS loyalty_target_locked INTEGER;

-- Backfill: for all existing records, lock the target to the tenant's current setting
UPDATE public.client_loyalty cl
SET loyalty_target_locked = (
    SELECT loyalty_target FROM public.tenants WHERE id = cl.tenant_id
)
WHERE loyalty_target_locked IS NULL;
