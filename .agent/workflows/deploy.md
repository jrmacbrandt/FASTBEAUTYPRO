---
description: Pipeline de deploy automático autorizado pelo usuário
---

// turbo-all
# Workflow de Deploy Automático

Este workflow foi autorizado pelo usuário para ser executado sem intervenção manual sempre que houver mudanças relevantes.

## Passos

1. **Commit das Mudanças**
   - Adicionar arquivos modificados: `git add .`
   - Realizar commit com mensagem descritiva: `git commit -m "feat/fix: descrição da mudança"`

2. **Sincronização com GitHub**
   - Enviar para o repositório remoto: `git push origin main`

3. **Deploy na Vercel**
   - A Vercel está configurada para deploy automático via GitHub.
   - Caso necessário forçar: `vercel --prod`

4. **Migrações Supabase**
   - Aplicar migrações pendentes se houver novos arquivos em `supabase/migrations`.
   - `npx supabase db push` (ou via MCP se disponível)

## Notas
- O usuário autorizou explicitamente a execução desses comandos em 07/02/2026.
- Sempre verificar o status do build após o push.
