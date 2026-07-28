# JNE App 1.0.0 — instalação

## 1. Copiar os arquivos

Na branch `develop`, copie o conteúdo deste pacote para a raiz do projeto e confirme as substituições.

```powershell
git checkout develop
git status
npm version 1.0.0 --no-git-tag-version
```

Não há dependências novas.

## 2. Supabase

Abra `supabase/migrations/1.0.0_launch.sql`, copie todo o conteúdo e execute no SQL Editor do projeto `jneapp`.

Resultado esperado:

```text
Success. No rows returned
```

A migração cria:

- edição segura do próprio perfil;
- bucket público `avatars` com upload restrito ao usuário;
- aceite versionado de termos e privacidade;
- registro de downloads VIP;
- limite de tentativas de convite;
- logs administrativos;
- métricas do painel.

## 3. Variável da URL pública

No `.env.local` e na Vercel adicione:

```env
NEXT_PUBLIC_APP_URL=https://app-jean-na-estrada-next.vercel.app
```

Quando o domínio principal for migrado, troque para `https://jneapp.app` e faça novo deploy.

## 4. Build

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

## 5. Testes obrigatórios

1. Faça login com uma conta comum.
2. Confirme o redirecionamento para `/aceite`.
3. Aceite os três documentos.
4. Edite nome, bio e avatar em `/perfil`.
5. Teste uma tentativa de convite inválido e depois um válido.
6. Baixe um arquivo VIP e confira a métrica no painel.
7. Faça uma alteração administrativa e confira `/admin/logs`.
8. Teste `/termos`, `/privacidade`, `/seguranca-apks`, `/sobre`, uma rota inexistente e o modo mobile.
9. Não exclua a conta administradora principal.

## 6. Publicar

```powershell
git add .
git commit -m "feat: preparar versao 1.0 para lancamento"
git push origin develop
```
