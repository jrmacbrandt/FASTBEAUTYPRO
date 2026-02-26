-- Add quaternary_color to tenants for background glow adjustment
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quaternary_color TEXT;

-- Set a default value for existing tenants if needed (optional)
-- UPDATE tenants SET quaternary_color = primary_color WHERE quaternary_color IS NULL;
