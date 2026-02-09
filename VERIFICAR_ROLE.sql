-- Verificação final do role no banco de dados
-- Execute este comando para GARANTIR que o role está correto

SELECT 
    id,
    email,
    role,
    full_name,
    tenant_id,
    status
FROM profiles 
WHERE email = 'jrmacbrandt@gmail.com';

-- Se o role NÃO for 'master', execute este comando alternativo:
-- (Substitui o role forçadamente)
UPDATE profiles 
SET role = 'master'::user_role
WHERE email = 'jrmacbrandt@gmail.com'
RETURNING id, email, role;
