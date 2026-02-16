---
description: Auditoria automática v4.0 e Deploy Integrado (Zero Regressão)
---

// turbo-all
# Workflow de Auditoria e Sincronização Automática

Este workflow deve ser executado obrigatoriamente após qualquer modificação no código para garantir a integridade do FastBeauty Pro.

## 1. Auditoria Técnica (Edição Cirúrgica)
- Verificar se apenas os arquivos necessários foram alterados.
- Confirmar se o isolamento de dados (tenant_id) foi preservado.
- Validar se o layout Master/Admin/Profissional/Cliente permanece intacto.

## 2. Execução de Testes (Auditoria v4.0)
- `npm test` (Executa vitest para finance, security e stock).
- `npx playwright test tests/flow.spec.ts` (Opcional, se houver ambiente para tal).

## 3. Sincronização GitHub
- `git add .`
- `git commit -m "audit: verificação v4.0 completa e sincronização automática"`
- `git push origin main`

## 4. Deploy Supabase & Vercel
- Se houver novos arquivos em `supabase/migrations/*`:
  - `npx supabase db push`
- O deploy Vercel é iniciado automaticamente via GitHub Action/Integration.

## 5. Declaração de Integridade
- Após a conclusão, declarar: "**Protocolo de Auditoria v4.0 executado: Integridade do Sistema Confirmada.**"
