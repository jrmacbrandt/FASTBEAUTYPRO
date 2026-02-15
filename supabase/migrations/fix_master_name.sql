-- ================================================================
-- CORREÇÃO DO NOME DO PERFIL MASTER
-- ================================================================
-- Este script garante que o nome correto apareça no painel

-- Atualizar o nome do perfil master
UPDATE profiles 
SET full_name = 'J. Roberto',
    role = 'master',
    tenant_id = NULL
WHERE email = 'jrmacbrandt@gmail.com';

-- Verificar o resultado
SELECT 
    id,
    email,
    full_name,
    role,
    tenant_id
FROM profiles 
WHERE email = 'jrmacbrandt@gmail.com';
