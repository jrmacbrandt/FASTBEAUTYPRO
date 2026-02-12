# Relatório Técnico: Fluxo CRM Intelligence v4.0

## 1. Introdução
O painel **CRM Intelligence** é o motor de retenção e fidelização do FastBeauty Pro. Ele transforma dados brutos de agendamentos e vendas em insights acionáveis para o administrador, permitindo o gerenciamento ativo da base de clientes e a configuração do programa de fidelidade.

## 2. Fluxo de Dados e Métricas (Intelligence Engine)
Os indicadores no topo do painel são calculados em tempo real através da biblioteca `@/lib/crm.ts`:

*   **Base Ativa:** Contagem total de registros na tabela `clients` vinculados ao `tenant_id`.
*   **Risco de Evasão (Churn Control):** Identifica clientes que não realizam um serviço há mais de 45 dias. O sistema filtra o campo `last_visit` para destacar quem precisa de um "empurrão" via WhatsApp.
*   **Clientes VIP:** Segmenta clientes com alto LTV (Lifetime Value), atualmente definidos como aqueles que transacionaram mais de R$ 500,00 na unidade.
*   **Próximos Prêmios:** Utiliza análise de frequência para identificar clientes que completaram mais de 70% da meta de selos atual, permitindo campanhas preventivas para fechar o ciclo de fidelidade.

## 3. Cartão Fidelidade (Loyalty Core)
O coração da retenção é o seletor de metas, que agora reside exclusivamente neste painel:

*   **Configuração Dinâmica:** O administrador escolhe entre 5, 8 ou 10 selos. 
*   **Persistência:** A escolha é salva na coluna `loyalty_target` da tabela `tenants`.
*   **Visual Preview:** O componente de "Visualização do App do Cliente" renderiza em tempo real a interface que o cliente verá em seu smartphone. 
    *   Círculos dourados representam selos conquistados.
    *   O ícone de presente (`redeem`) representa o slot da recompensa.
*   **Regra de Negócio Automatizada:** Ao finalizar uma comanda no checkout, o sistema incrementa automaticamente 1 selo no perfil do cliente. Ao atingir a meta, o 6º, 9º ou 11º serviço (dependendo da meta) é gerado com valor zerado.

## 4. Central de Engajamento (Motor de Transmissão)
A área à direita foca na conversão:

*   **Segmentação Rápida:** Atalhos para "Churn Control" e "Aniversariantes".
*   **Integração WhatsApp:** Ao selecionar um segmento, o sistema gera links `wa.me` com mensagens personalizadas (ex: *"Olá [Nome], notamos que você não nos visita há algum tempo..."*), garantindo custo zero de API.

## 5. Protocolo de Sincronização e Segurança (Audit)
*   **Isolamento RLS:** Todas as consultas são filtradas estritamente pelo `tenant_id` do usuário logado.
*   **Cache e Performance:** O uso de `useMemo` garante que o preview do cartão não cause re-renders desnecessários.
*   **Robustez:** O sistema agora utiliza o `profiles` table para verificar o `tenant_id` de forma definitiva, evitando falhas de sincronização de metadados do Auth.

## 6. Conclusão
O CRM Intelligence não é apenas um painel de visualização, mas um dashboard de comando para garantir que o cliente retorne, gaste mais e se sinta valorizado através do sistema de selos.
