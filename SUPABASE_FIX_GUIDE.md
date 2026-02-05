# GUIA: Resolvendo o Erro "Forbidden use of secret API key"

## O Que Aconteceu?
Você está vendo o erro `Forbidden use of secret API key in browser`. Isso acontece porque, durante a configuração na Vercel, a chave **"service_role"** (que é secreta e tem poder total sobre o banco) foi colocada no campo reservado para a chave **"anon / public"**.

O Supabase bloqueia isso automaticamente para proteger seus dados, impedindo que uma chave secreta seja exposta no navegador.

---

## Como Corrigir (Passo a Passo)

### 1. Pegue a Chave Correta no Supabase
1. Acesse seu **[Dashboard do Supabase](https://supabase.com/dashboard/project/sxunkigrburoknsshezl/settings/api)**.
2. Vá em **Settings (ícone de engrenagem)** -> **API**.
3. Procure pela seção **"Project API keys"**.
4. Localize a chave rotulada como **`anon` / `public`**.
5. Clique em **Copy** para copiar essa chave.
   > **NÃO** use a chave `service_role`.

### 2. Atualize na Vercel
1. Acesse as **[Configurações de Variáveis da Vercel](https://vercel.com/jose-robertos-projects-862730ce/fastbeautypro/settings/environment-variables)**.
2. Encontre a variável **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**.
3. Clique nos três pontinhos (...) e selecione **Edit**.
4. Apague o valor atual e **cole a chave que você copiou no passo anterior**.
5. Clique em **Save**.

### 3. Aplique a Mudança (Redeploy)
A Vercel não atualiza o site automaticamente apenas mudando a variável. Você precisa "avisar" ela:
1. Vá na aba **[Deployments](https://vercel.com/jose-robertos-projects-862730ce/fastbeautypro/deployments)** da Vercel.
2. Clique no ícone de três pontinhos (...) do deployment mais recente (o que está no topo).
3. Selecione a opção **Redeploy**.
4. Clique em **Redeploy** na caixa de confirmação.

---

## Próximo Passo: Criar seu Usuário
Após corrigir as chaves acima, o erro de segurança sumirá, mas você receberá **"Invalid login credentials"** porque o banco de dados está vazio.

### 1. Criar Usuário no Supabase
1. Acesse: **[Supabase Auth Users](https://supabase.com/dashboard/project/sxunkigrburoknsshezl/auth/users)**
2. Clique em **Add user** -> **Create new user**.
3. Use seu e-mail (`jrbrandt@hotmail.com`) e defina uma senha.
4. Garanta que a opção **"Auto-confirm user"** esteja marcada.
5. Clique em **Create user**.

### 2. Inicializar Perfil de Administrador (Opcional - Recomendado)
O login funcionará, mas como o banco está zerado, você não verá dados. Se quiser que eu crie seu perfil de administrador e a primeira unidade (Barbearia/Salão) automaticamente via SQL, me avise!

---

## Passo Extra: Inicializar Banco de Dados (SQL)
Depois de criar o usuário no dashboard (**Passo 1** acima), você precisa rodar este script para criar seu perfil de dono e sua unidade de negócio.

1. Acesse o **[SQL Editor do Supabase](https://supabase.com/dashboard/project/sxunkigrburoknsshezl/sql/new)**.
2. Copie e cole o código abaixo (copie **APENAS** o texto):

```
DO $$
DECLARE
    user_id uuid;
    tenant_id uuid := extensions.uuid_generate_v4();
BEGIN
    -- 1. Pega o ID do seu usuário criado
    SELECT id INTO user_id FROM auth.users WHERE email = 'jrmacbrandt@gmail.com';

    IF user_id IS NULL THEN
        RAISE NOTICE 'ERRO: O usuário jrmacbrandt@gmail.com não foi encontrado!';
    ELSE
        -- 2. Cria a sua Unidade (Tenant)
        INSERT INTO public.tenants (id, name, slug, business_type, active)
        VALUES (tenant_id, 'Meu Estabelecimento', 'meu-estabelecimento', 'barber', true)
        ON CONFLICT (slug) DO NOTHING;

        -- 3. Cria o seu Perfil de Administrador (Dono)
        INSERT INTO public.profiles (id, tenant_id, full_name, cpf, email, role, status)
        VALUES (user_id, tenant_id, 'Administrador Jr Brandt', '000.000.000-00', 'jrmacbrandt@gmail.com', 'owner', 'active')
        ON CONFLICT (id) DO UPDATE SET role = 'owner', status = 'active';

        RAISE NOTICE 'SUCESSO: Seu perfil e unidade foram configurados!';
    END IF;
END $$;
```
3. Clique em **Run**.

---

## Passo Final: Liberar Acesso (RLS Policies)
O Supabase bloqueia a leitura de dados por padrão. Se você logar e não for redirecionado, é porque o sistema não tem permissão para ler seu perfil.

1. No **SQL Editor**, rode este comando:

```sql
-- Permite que o usuário leia seu próprio perfil
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- Permite que o usuário atualize seu próprio perfil
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

---

## Por que isso resolve?
Mesmo com o login funcionando, o código precisa ler a coluna `role` (cargo) para saber se te manda para `/admin` ou `/profissional`. Sem essas "Policies" (políticas), o Supabase retorna um erro de acesso negado e o site fica parado na tela de seleção.
