-- ================================================================
-- 🗑️ CRM CLEANUP & SETTINGS (v6.0)
-- ================================================================

-- 1. Add CRM settings to tenants if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenants' AND COLUMN_NAME = 'crm_churn_days') THEN
        ALTER TABLE public.tenants ADD COLUMN crm_churn_days INT DEFAULT 45;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tenants' AND COLUMN_NAME = 'crm_vip_threshold') THEN
        ALTER TABLE public.tenants ADD COLUMN crm_vip_threshold INT DEFAULT 500;
    END IF;
END $$;

-- 2. Function to delete campaign history older than 3 months
CREATE OR REPLACE FUNCTION cleanup_old_campaigns()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_items INT := 0;
    deleted_campaigns INT := 0;
    result json;
BEGIN
    -- Delete campaign items first (foreign key)
    DELETE FROM public.campaign_items
    WHERE campaign_id IN (
        SELECT id FROM public.campaigns 
        WHERE created_at < NOW() - INTERVAL '3 months'
    );
    GET DIAGNOSTICS deleted_items = ROW_COUNT;

    -- Delete campaigns
    DELETE FROM public.campaigns
    WHERE created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS deleted_campaigns = ROW_COUNT;

    result := json_build_object(
        'deleted_campaigns', deleted_campaigns,
        'deleted_items', deleted_items,
        'status', 'success',
        'message', 'Cleanup completed for data older than 3 months'
    );

    RETURN result;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_old_campaigns() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_campaigns() TO service_role;
