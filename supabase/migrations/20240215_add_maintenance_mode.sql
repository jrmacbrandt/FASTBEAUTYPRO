-- Migration: Add maintenance mode to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE;

-- Optional: Index for performance if needed
-- CREATE INDEX IF NOT EXISTS idx_tenants_maintenance_mode ON tenants(maintenance_mode);
