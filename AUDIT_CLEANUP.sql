-- ================================================================
-- AUDITORIA E LIMPEZA DE DADOS (V4.1)
-- ================================================================

-- 1. VISUALIZAR O PROPRIETÁRIO MASTER (SEGURANÇA PARA NÃO APAGAR O MESTRE)
SELECT id, email, role FROM auth.users WHERE email = 'jrmacbrandt@gmail.com';

-- 2. EXCLUIR O USUÁRIO Y AHOO (CONFORME SOLICITADO)
-- Atenção: Ao apagar de auth.users, o CASCADE deve limpar profiles e relacionamentos.
DELETE FROM auth.users WHERE email = 'jrmacbrandt@yahoo.com';

-- 3. NUCLEAR OPTION: APAGAR TUDO MENOS O MASTER
-- Se você quer LIMPAR TODO O RESTO e deixar SÓ o Master:
DELETE FROM auth.users 
WHERE email NOT IN ('jrmacbrandt@gmail.com');

-- 4. LIMPEZA DE ORPHAN TENANTS (Se houver unidades sem proprietários)
-- Como o Master não tem tenant (usualmente), podemos limpar tenants que não tenham profiles associados (ou limpar tudo se o objetivo é zerar).
-- Descomente a linha abaixo para apagar TODOS os estabelecimentos (limpeza total da plataforma):
DELETE FROM tenants; 

-- 5. AUDITORIA FINAL (VERIFICAÇÃO)
-- Deve retornar apenas 1 linha (jrmacbrandt@gmail.com)
SELECT 'USERS RESTANTES' as check_type, email, role, created_at FROM auth.users;

-- Deve retornar 0 linhas (se a limpeza de tenants foi feita)
SELECT 'TENANTS RESTANTES' as check_type, name, slug, status FROM tenants;

-- Deve retornar 0 linhas (perfis que não sejam do master)
SELECT 'PROFILES RESTANTES' as check_type, full_name, role FROM profiles WHERE email != 'jrmacbrandt@gmail.com';
