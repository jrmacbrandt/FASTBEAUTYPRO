-- Migration: Master Universal Access (V12.0)
-- Purpose: Grant Master user full bypass on RLS for tenant-specific tables.
-- This allows impersonation to work correctly at the database level.

-- Function to check if a user is Master (Safety check)
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role IN ('master', 'admin_master') OR email = 'jrmacbrandt@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Master Bypass to Core Tables
-- Services
DROP POLICY IF EXISTS "allow_master_all_services" ON services;
CREATE POLICY "allow_master_all_services" ON services
FOR ALL TO authenticated USING (public.is_master());

-- Profiles (Team)
DROP POLICY IF EXISTS "allow_master_all_profiles" ON profiles;
CREATE POLICY "allow_master_all_profiles" ON profiles
FOR ALL TO authenticated USING (public.is_master());

-- Tenants
DROP POLICY IF EXISTS "allow_master_all_tenants" ON tenants;
CREATE POLICY "allow_master_all_tenants" ON tenants
FOR ALL TO authenticated USING (public.is_master());

-- Appointments
DROP POLICY IF EXISTS "allow_master_all_appointments" ON appointments;
CREATE POLICY "allow_master_all_appointments" ON appointments
FOR ALL TO authenticated USING (public.is_master());

-- Products (Stock)
DROP POLICY IF EXISTS "allow_master_all_products" ON products;
CREATE POLICY "allow_master_all_products" ON products
FOR ALL TO authenticated USING (public.is_master());

-- Orders (Comandas)
DROP POLICY IF EXISTS "allow_master_all_orders" ON orders;
CREATE POLICY "allow_master_all_orders" ON orders
FOR ALL TO authenticated USING (public.is_master());

DROP POLICY IF EXISTS "allow_master_all_order_items" ON order_items;
CREATE POLICY "allow_master_all_order_items" ON order_items
FOR ALL TO authenticated USING (public.is_master());

-- Inventory/Stock logs
DROP POLICY IF EXISTS "allow_master_all_inventory" ON inventory_logs;
CREATE POLICY "allow_master_all_inventory" ON inventory_logs
FOR ALL TO authenticated USING (public.is_master());

-- Notification
DROP POLICY IF EXISTS "allow_master_all_notifications" ON notifications;
CREATE POLICY "allow_master_all_notifications" ON notifications
FOR ALL TO authenticated USING (public.is_master());
