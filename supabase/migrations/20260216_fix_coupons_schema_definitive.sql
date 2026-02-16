
-- ================================================================
-- 🎟️ FIX: CORREÇÃO ESTRUTURAL DA TABELA DE CUPONS v4.2
-- ================================================================
-- Finalidade: Garantir que a tabela 'coupons' possua todas as colunas
-- necessárias para o funcionamento do Painel Master e Registro.

BEGIN;

-- 1. ADIÇÃO DE COLUNAS FALTANTES (MODO DEFENSIVO)
-- Se a tabela não existir, ela será criada. Se existir, apenas as colunas faltantes serão adicionadas.

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

DO $$ 
BEGIN
    -- discount_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='discount_type') THEN
        ALTER TABLE public.coupons ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'full_access';
    END IF;

    -- discount_value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='discount_value') THEN
        ALTER TABLE public.coupons ADD COLUMN discount_value NUMERIC DEFAULT 0;
    END IF;

    -- duration_months
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='duration_months') THEN
        ALTER TABLE public.coupons ADD COLUMN duration_months INT DEFAULT 0;
    END IF;

    -- max_uses
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='max_uses') THEN
        ALTER TABLE public.coupons ADD COLUMN max_uses INT DEFAULT 999999;
    END IF;

    -- used_count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='used_count') THEN
        ALTER TABLE public.coupons ADD COLUMN used_count INT DEFAULT 0;
    END IF;

    -- expires_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='expires_at') THEN
        ALTER TABLE public.coupons ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='active') THEN
        ALTER TABLE public.coupons ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 2. SEGURANÇA E POLÍTICAS RLS
-- Garante que o Master tenha controle total e outros possam apenas ler cupons ativos.

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Master CRUD coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "coupons_universal_access" ON public.coupons;

-- Nova política universal baseada na função is_master() (se existir) ou role fixo
CREATE POLICY "coupons_master_all" ON public.coupons
    FOR ALL 
    TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master'
        OR (SELECT email FROM public.profiles WHERE id = auth.uid()) = 'jrmacbrandt@gmail.com'
    )
    WITH CHECK (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master'
        OR (SELECT email FROM public.profiles WHERE id = auth.uid()) = 'jrmacbrandt@gmail.com'
    );

CREATE POLICY "coupons_public_read" ON public.coupons
    FOR SELECT
    TO authenticated
    USING (active = true);

-- 3. REFRESH SCHEMA CACHE
-- Força o PostgREST a recarregar o esquema para reconhecer as novas colunas imediatamente.
NOTIFY pgrst, 'reload schema';

COMMIT;
