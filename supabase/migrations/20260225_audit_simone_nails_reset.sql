-- =========================================================================
-- 🛡️ [BLINDADO] AUDITORIA ABSOLUTA DE RESET DE INQUILINO
-- =========================================================================
-- Alvo: "Simone Nails"
-- ID do Inquilino: 97e69b01-eeef-4d80-960a-f4467b90f505
-- Propósito: Garantir que absolutamente NENHUM dado orfão (comandas,
-- agendas, clientes, configuracoes, etc) sobreviveu ao Factory Reset,
-- exceto os dados da Unidade e o Perfil do Proprietário (Owner).
-- =========================================================================

-- BLOCO DE CONTAGEM GERAL (DEVE RETORNAR 0 PARA TUDO)
SELECT 
    (SELECT COUNT(*) FROM orders WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_comandas,
    (SELECT COUNT(*) FROM appointments WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_agendamentos,
    (SELECT COUNT(*) FROM clients WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_clientes,
    (SELECT COUNT(*) FROM products WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_produtos,
    (SELECT COUNT(*) FROM services WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_servicos,
    (SELECT COUNT(*) FROM subscription_plans WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_planos_assinatura,
    (SELECT COUNT(*) FROM client_subscriptions WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_assinaturas_clientes,
    (SELECT COUNT(*) FROM client_loyalty WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_fidelidade,
    (SELECT COUNT(*) FROM supplies WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_insumos,
    (SELECT COUNT(*) FROM stock_transactions WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_movimentacoes_estoque,
    (SELECT COUNT(*) FROM notifications WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_notificacoes,
    (SELECT COUNT(*) FROM campaigns WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505') AS total_campanhas;

-- BLOCO DE VERIFICAÇÃO DE PERFIS (DEVE RETORNAR APENAS 1 -> O OWNER)
SELECT id, full_name, role 
FROM profiles 
WHERE tenant_id = '97e69b01-eeef-4d80-960a-f4467b90f505';

-- INSTRUÇÃO PARA STORAGE: 
-- Como o Storage Bucket não pode ser varrido diretamente pelo SQL desta forma sem extensões específicas, 
-- por favor verifique manualmente no painel:
-- 1. Vá em Storage -> tenant-assets ou logos
-- 2. Busque por pastas ou arquivos prefixados com "97e69b01-eeef-4d80-960a-f4467b90f505"
-- Se retornarem vazios, a exclusão em massa foi 100% bem-sucedida e atômica.
