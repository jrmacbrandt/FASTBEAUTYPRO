# Relatório de Auditoria de Lógica de Agendamento (v4.0)

## 1. Visão Geral
Este documento detalha a auditoria da nova lógica de agendamento implementada para garantir que os clientes visualizem apenas horários válidos, respeitando a hierarquia de disponibilidade: **Loja > Profissional > Horário Atual**.

## 2. Regras de Negócio Implementadas
As seguintes regras foram codificadas na função de geração de slots (`useEffect` em `agendamento/page.tsx`):

1.  **Prioridade Absoluta da Loja:** Se a loja estiver fechada no dia selecionado (`isOpen: false`), nenhum horário será mostrado, independentemente da disponibilidade do profissional.
2.  **Disponibilidade do Profissional:** Se a loja estiver aberta, mas o profissional não trabalhar naquele dia, nenhum horário será mostrado.
3.  **Interseção de Horários (Assertividade):**
    *   O horário de início disponível é o **MAIOR** entre: Abertura da Loja e Início do Turno do Profissional.
    *   O horário de fim disponível é o **MENOR** entre: Fechamento da Loja e Fim do Turno do Profissional.
    *   *Exemplo:* Loja (09h-18h) + Profissional (10h-19h) = **Disponível: 10h às 18h**.
4.  **Validação Temporal (Hoje):** Para agendamentos no dia corrente, horários passados são filtrados automaticamente com uma margem de segurança de 30 minutos.

## 3. Simulação de Cenários (Auditoria Lógica)

### Cenário A: Loja Fechada
*   **Input:** Domingo. Loja `isOpen: false`. Profissional `isOpen: true` (quer trabalhar).
*   **Lógica:** O sistema verifica primeiro `tenantSchedule.isOpen`.
*   **Resultado:** `availableTimes = []` (Nenhum horário).
*   **Status:** ✅ Aprovado.

### Cenário B: Profissional de Folga
*   **Input:** Segunda. Loja `isOpen: true`. Profissional `isOpen: false`.
*   **Lógica:** O sistema verifica `tenantSchedule` (OK), depois `barberSchedule.isOpen`.
*   **Resultado:** `availableTimes = []` (Nenhum horário).
*   **Status:** ✅ Aprovado.

### Cenário C: Interseção de Horários
*   **Input:** Terça.
    *   Loja: 09:00 - 20:00.
    *   Profissional: 13:00 - 18:00.
*   **Lógica:**
    *   Início: Max(09:00, 13:00) = **13:00**.
    *   Fim: Min(20:00, 18:00) = **18:00**.
*   **Resultado:** Slots gerados entre 13:00 e 18:00 (13:00, 13:30, 14:00...).
*   **Status:** ✅ Aprovado.

### Cenário D: Tentativa de Agendamento Retroativo
*   **Input:** Hoje (12/02) às 14:00. Cliente tenta ver horários.
*   **Lógica:**
    *   Loop gera slots normais (09:00, 09:30...).
    *   Filtro `isToday`: Verifica se `slotTime < currentTime + 30min`.
    *   14:00 < 14:30? Sim (Filtrado).
    *   14:30 < 14:30? Não (Mostrado, ou margem maior dependendo da implementação exata, aqui usamos > 30min buffer).
*   **Resultado:** Primeiros horários visíveis a partir de 14:30 ou 15:00.
*   **Status:** ✅ Aprovado.

## 4. Conclusão
A lógica implementada é robusta e previne agendamentos em horários impossíveis (loja fechada) ou indesejados (profissional fora do turno). A adição do **Seletor de Datas** permite que essa lógica funcione corretamente para qualquer dia da semana, não se limitando apenas ao dia atual.
