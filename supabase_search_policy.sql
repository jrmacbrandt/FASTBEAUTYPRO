-- ============================================
-- FASTBEAUTYPRO: CORREÇÃO DE POLÍTICA PARA BUSCA DE ESTABELECIMENTOS
-- Execute este script no SQL Editor do Supabase
-- https://supabase.com/dashboard/project/sxunkigrburoknsshezl/sql/new
-- ============================================

-- Permitir que qualquer usuário (autenticado ou não) faça busca de estabelecimentos
-- Isso é necessário para o registro de profissionais poder encontrar a loja

-- 1. Adicionar política de leitura pública para tenants (apenas busca)
DROP POLICY IF EXISTS "Public can search tenants" ON public.tenants;
CREATE POLICY "Public can search tenants" ON public.tenants 
    FOR SELECT 
    USING (true);

-- 2. Verificar se a política foi criada
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'tenants';
