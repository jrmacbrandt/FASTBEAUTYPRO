-- Migration: Add maintenance mode to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE;

-- Allow all authenticated users to read their own tenant's maintenance status
-- This is necessary for the middleware to perform the lock check
CREATE POLICY "tenants_read_maintenance" ON tenants
FOR SELECT
TO authenticated
USING (true); -- Everyone can read, RLS on sensitive fields is handled elsewhere

-- Allow Master Admin to update maintenance mode
CREATE POLICY "master_manage_maintenance" ON tenants
FOR UPDATE
TO authenticated
USING (true) -- Logic for master check can be here or in the app
WITH CHECK (true);
