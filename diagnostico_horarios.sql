-- Diagnóstico de Horários de Agendamento
-- Execute este script no Supabase SQL Editor para verificar a configuração

-- 1. Verificar configuração da loja "Simone Nails"
SELECT 
    id,
    name,
    slug,
    business_hours,
    created_at
FROM tenants
WHERE slug = 'simone-nails';

-- 2. Verificar configuração do profissional "Zé das Coves"
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.cpf,
    p.work_hours,
    p.status,
    p.tenant_id
FROM profiles p
JOIN tenants t ON p.tenant_id = t.id
WHERE t.slug = 'simone-nails'
  AND p.full_name ILIKE '%zé%coves%';

-- 3. Verificar agendamentos existentes para amanhã
SELECT 
    a.id,
    a.scheduled_at,
    a.status,
    p.full_name as barber_name,
    s.name as service_name
FROM appointments a
JOIN profiles p ON a.barber_id = p.id
JOIN services s ON a.service_id = s.id
JOIN tenants t ON a.tenant_id = t.id
WHERE t.slug = 'simone-nails'
  AND DATE(a.scheduled_at) = CURRENT_DATE + INTERVAL '1 day'
ORDER BY a.scheduled_at;

-- 4. Verificar estrutura do business_hours
SELECT 
    name,
    slug,
    jsonb_pretty(business_hours) as business_hours_formatted
FROM tenants
WHERE slug = 'simone-nails';

-- 5. Verificar estrutura do work_hours do profissional
SELECT 
    p.full_name,
    jsonb_pretty(p.work_hours) as work_hours_formatted
FROM profiles p
JOIN tenants t ON p.tenant_id = t.id
WHERE t.slug = 'simone-nails'
  AND p.full_name ILIKE '%zé%coves%';
