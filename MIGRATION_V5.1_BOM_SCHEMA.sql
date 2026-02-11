-- ================================================================
-- MIGRATION V5.1: BILL OF MATERIALS (BOM) SCHEMA
-- ================================================================
-- This script creates the structure for linking Services to Products.
-- It is a preparation step and does not affect current frontend logic.

BEGIN;

-- 1. Create service_products table
CREATE TABLE IF NOT EXISTS service_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT, -- Prevent deleting product if used in a service BOM
    quantity NUMERIC(10, 4) NOT NULL DEFAULT 1.0, -- Supports fractional usage (e.g. 0.5 tube)
    unit_type TEXT NOT NULL DEFAULT 'un', -- 'ml', 'g', 'un'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE service_products ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Policy: Tenant Isolation (Select)
CREATE POLICY "service_products_select_policy" ON service_products
    FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Policy: Admin/Owner Management (Insert/Update/Delete)
CREATE POLICY "service_products_modification_policy" ON service_products
    FOR ALL
    USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()) 
        AND 
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE role IN ('admin', 'admin-master')
        )
    );

-- 4. Create Index for Performance
CREATE INDEX IF NOT EXISTS idx_service_products_service ON service_products(service_id);
CREATE INDEX IF NOT EXISTS idx_service_products_product ON service_products(product_id);

COMMIT;
