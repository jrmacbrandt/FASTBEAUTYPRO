-- SCRIPT DE LIMPEZA MANUAL PARA "jrbrandt@hotmail.com"
-- Execute este script no SQL Editor do Supabase para remover completamente o usuário e permitir novo cadastro.

-- 1. Remover da tabela pública de perfis (caso exista)
DELETE FROM public.profiles WHERE email = 'jrbrandt@hotmail.com';

-- 2. Remover da tabela de inquilinos (caso tenha criado algum tenant orfão)
-- ATENÇÃO: Isso removerá qualquer loja vinculada a este email, se houver lógica de vínculo direto.
-- Se o vinculo for apenas pelo profile, o passo 1 já resolveu a parte pública.
-- Mas vamos garantir que não sobrou nenhum tenant com esse nome "Loja do Zé" pendente.
DELETE FROM public.tenants WHERE name = 'Loja do Zé';

-- 3. Remover da tabela de autenticação (auth.users)
-- Este é o passo crucial que libera o email para novo cadastro.
DELETE FROM auth.users WHERE email = 'jrbrandt@hotmail.com';

-- 4. Confirmação
SELECT 'Limpeza concluída para jrbrandt@hotmail.com' as status;
