# 🔧 Como Limpar Cache e Service Workers Antigos

## Problema
O navegador ainda está carregando a versão antiga do site com URLs `/#/sistema` devido a cache e service workers.

## Solução Rápida (1 minuto)

### Opção 1: Hard Refresh (Recomendado)
1. **No Chrome/Edge:**
   - Pressione `Ctrl + Shift + Delete` (Windows) ou `Cmd + Shift + Delete` (Mac)
   - Selecione "Imagens e arquivos em cache"
   - Clique em "Limpar dados"
   - OU simplesmente pressione `Ctrl + F5` na página

2. **No Firefox:**
   - Pressione `Ctrl + Shift + Delete`
   - Marque "Cache"
   - Clique em "Limpar agora"

### Opção 2: Modo Anônimo/Incógnito
- Abra uma janela anônima (`Ctrl + Shift + N`)
- Acesse `https://fastbeautypro.vercel.app`
- Deve carregar a versão nova sem `#`

### Opção 3: DevTools (Para Desenvolvedores)
1. Pressione `F12` para abrir DevTools
2. Vá na aba "Application" (Chrome) ou "Armazenamento" (Firefox)
3. Clique em "Service Workers"
4. Clique em "Unregister" em todos os service workers
5. Limpe o "Cache Storage"
6. Recarregue a página com `Ctrl + F5`

## Verificação
Após limpar o cache, a URL deve ser:
- ✅ `https://fastbeautypro.vercel.app/` (sem `#`)
- ✅ `https://fastbeautypro.vercel.app/login` (sem `#`)
- ❌ ~~`https://fastbeautypro.vercel.app/#/sistema`~~ (antigo)

## Para Usuários Finais
Peça aos usuários que:
1. Limpem o cache do navegador
2. Ou façam um "hard refresh" com `Ctrl + F5`
3. Ou acessem em modo anônimo pela primeira vez

Após a primeira limpeza, o site carregará normalmente sem precisar repetir o processo.
