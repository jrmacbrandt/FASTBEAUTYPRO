-- 🛡️ [BLINDADO] V5.1 - Permissão Segura de CRM Público (Agendamento Expresso)
-- Criação de Políticas para permitir o UPSERT de clientes via Booking Site
-- Sem estas permissões, a tentativa de salvar o cliente (Felipe) do lado cliente anônimo falha e gera "comanda órfã".

BEGIN;

-- 1. Política de Inserção: Permite a qualquer um na internet (anon/public) INSERIR um cliente,
-- fundamental na primeira vez em que um cliente marca um horário online.
DROP POLICY IF EXISTS "Permitir inserção anônima de clientes (Booking)" ON "public"."clients";
CREATE POLICY "Permitir inserção anônima de clientes (Booking)" ON "public"."clients"
AS PERMISSIVE FOR INSERT
TO public, anon
WITH CHECK (true);

-- 2. Política de Atualização: Repete a segurança; clientes online precisam de permissão UPDATE 
-- para quando realizam um novo agendamento, executando um UPSERT para atualizar o campo 'last_visit'.
DROP POLICY IF EXISTS "Permitir atualização anônima de clientes (Booking)" ON "public"."clients";
CREATE POLICY "Permitir atualização anônima de clientes (Booking)" ON "public"."clients"
AS PERMISSIVE FOR UPDATE
TO public, anon
USING (true)
WITH CHECK (true);

COMMIT;
