-- MIGRATION: Cura de Horários (Restauro de Sextas-Feiras)
-- 🛡️ [BLINDADO] Protocolo de Integridade de Agendamento

-- 1. Curar Horários da Loja (Tenants)
-- Garante que o objeto business_hours tenha pelo menos as chaves básicas se estiverem nulas ou vazias
UPDATE public.tenants
SET business_hours = jsonb_build_object(
    'segunda', COALESCE(business_hours->'segunda', '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'terca',   COALESCE(business_hours->'terca',   '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'quarta',  COALESCE(business_hours->'quarta',  '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'quinta',  COALESCE(business_hours->'quinta',  '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'sexta',   COALESCE(business_hours->'sexta',   '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'sabado',  COALESCE(business_hours->'sabado',  '{"open": "09:00", "close": "19:00", "isOpen": false}'::jsonb),
    'domingo', COALESCE(business_hours->'domingo', '{"open": "09:00", "close": "19:00", "isOpen": false}'::jsonb)
)
WHERE slug = 'simone-coiffeur';

-- 2. Curar Horários do Profissional (Profiles)
-- Faz o mesmo para o João Rolha e outros profissionais
UPDATE public.profiles
SET work_hours = jsonb_build_object(
    'segunda', COALESCE(work_hours->'segunda', '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'terca',   COALESCE(work_hours->'terca',   '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'quarta',  COALESCE(work_hours->'quarta',  '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'quinta',  COALESCE(work_hours->'quinta',  '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'sexta',   COALESCE(work_hours->'sexta',   '{"open": "09:00", "close": "19:00", "isOpen": true}'::jsonb),
    'sabado',  COALESCE(work_hours->'sabado',  '{"open": "09:00", "close": "19:00", "isOpen": false}'::jsonb),
    'domingo', COALESCE(work_hours->'domingo', '{"open": "09:00", "close": "19:00", "isOpen": false}'::jsonb)
)
WHERE role = 'barber' AND (full_name ILIKE '%João Rolha%' OR work_hours IS NULL OR work_hours = '{}'::jsonb);
