-- 🛡️ MASTER UNIVERSAL BYPASS (V2.0)
-- Este script garante que o perfil MASTER tenha acesso irrestrito a todas as tabelas
-- operacionais para suporte técnico e manutenção.

-- 1. Função Auxiliar (Caso não exista)
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

-- 2. Aplicação de Políticas de Bypass Universal
-- Para cada tabela, criamos uma política que permite TUDO se for Master.

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'tenants', 'profiles', 'services', 'products', 'appointments', 
        'orders', 'inventory_movements', 'loyalty_vouchers', 
        'order_items', 'notifications', 'coupons'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "master_bypass_%I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "master_bypass_%I" ON %I FOR ALL TO authenticated USING (public.is_master())', t, t);
    END LOOP;
END $$;

-- 3. Caso especial para tabelas onde o Master já possui políticas fortes, 
-- garantimos que as políticas de 'owner' não bloqueiem o Master.
-- O "FOR ALL" com "is_master()" no USING já resolve a maioria dos casos no Supabase.
