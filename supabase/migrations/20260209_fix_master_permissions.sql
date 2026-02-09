-- Migration: Fix Master Permissions (Consolidated)
-- Created at: 2026-02-09
-- Purpose: Grant Master user full DELETE/UPDATE/SELECT permissions on tenants and related tables

-- 1. Tenants (Delete, Update, Select)
CREATE POLICY "allow_master_delete_tenants" ON tenants
FOR DELETE TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

CREATE POLICY "allow_master_update_tenants" ON tenants
FOR UPDATE TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid)
WITH CHECK (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

CREATE POLICY "allow_master_select_tenants" ON tenants
FOR SELECT TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

-- 2. Profiles (Delete, Select)
CREATE POLICY "allow_master_delete_profiles" ON profiles
FOR DELETE TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

CREATE POLICY "allow_master_select_profiles" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

-- 3. Related Tables (Delete only)
CREATE POLICY "allow_master_delete_appointments" ON appointments
FOR DELETE TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

CREATE POLICY "allow_master_delete_products" ON products
FOR DELETE TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);

CREATE POLICY "allow_master_delete_services" ON services
FOR DELETE TO authenticated
USING (auth.uid() = '2a898476-328c-4cd8-9d21-4778ec48c6ab'::uuid);
