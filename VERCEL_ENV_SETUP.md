# Configuração de Variáveis de Ambiente na Vercel

## ⚠️ AÇÃO NECESSÁRIA IMEDIATA

O deploy na Vercel está falhando porque as variáveis de ambiente do Supabase não foram configuradas.

## Passos para Resolver

### 1. Acesse o Dashboard da Vercel
- Vá para: https://vercel.com/jose-robertos-projects-862730ce/fastbeautypro
- Clique em **Settings** → **Environment Variables**

### 2. Adicione as Seguintes Variáveis

Você precisa adicionar **2 variáveis de ambiente** com os valores do seu projeto Supabase:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | (URL do seu projeto Supabase) | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Chave anônima do Supabase) | Production, Preview, Development |

### 3. Onde Encontrar os Valores

1. Acesse: https://supabase.com/dashboard/project/sxunkigrburoknsshezl
2. Vá em **Settings** → **API**
3. Copie:
   - **Project URL** → Use como `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Use como `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Após Adicionar

1. As variáveis serão aplicadas automaticamente
2. Faça um novo deploy (ou a Vercel fará automaticamente)
3. O site funcionará normalmente

## Observações

- As variáveis com prefixo `NEXT_PUBLIC_` são expostas no navegador (seguro para chaves públicas)
- **NÃO** exponha a `service_role_key` como variável pública
- Para produção, considere usar variáveis específicas de ambiente
