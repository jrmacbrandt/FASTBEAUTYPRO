
# FastBeauty Pro - Diretrizes de Operação EliteBarber-Architect v4.0

## 🛡️ PROTOCOLO DE SINCRONIZAÇÃO TOTAL (OBRIGATÓRIO)
**Regra de Ouro:** Toda e qualquer modificação no código, por menor que seja, deve ser seguida IMEDIATAMENTE pela sincronização com GitHub e atualização dos ambientes Supabase e Vercel.

### Fluxo Pós-Modificação:
1. **Auditoria Cirúrgica:** Validar se a mudança afetou apenas o escopo solicitado.
2. **Commit Automático:** `git add .` e `git commit -m "feat/fix: [descrição]"`
3. **Push GitHub:** `git push origin main`
4. **Deploy Vercel:** (Automático via GitHub)
5. **Sync Supabase:** Se houver mudanças em `supabase/migrations`, executar `npx supabase db push`.

## 🏢 HIERARQUIA E REGRAS DE NEGÓCIO
- Master Admin: Gestão global via v_master_stats.
- Proprietário: Gestão de equipe e faturamento.
- Profissional: Agenda e Comanda.
- Hibridismo: Barber (Zinc/Amber) vs Salon (Rose/Pastel).

## 🔍 PROTOCOLO DE AUDITORIA E FALHA
- finance.test.ts: Cálculos de comissão.
- security.test.ts: Isolamento RLS.
- stock.test.ts: Bloqueio de estoque zerado.
- flow.spec.ts: Agendamento B2C.

---
*Autorizado por: USER (14/02/2026)*
*Execução Automática: Habilitada (Protocolo turbo-all)*
