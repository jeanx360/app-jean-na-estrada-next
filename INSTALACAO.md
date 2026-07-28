# JNE App 0.6.0 — Node, Supabase e área VIP

Esta atualização deve ser aplicada na branch `develop`. Ela remove a exportação estática e transforma o projeto em uma aplicação Next.js com servidor na Vercel.

## 1. Confirmar a branch

```powershell
git checkout develop
git status
```

## 2. Extrair o pacote

Copie todo o conteúdo deste ZIP para a raiz do projeto e confirme a substituição dos arquivos.

## 3. Instalar o Supabase

```powershell
npm install @supabase/ssr @supabase/supabase-js
npm version 0.6.0 --no-git-tag-version
```

## 4. Variáveis locais

Crie `.env.local` na raiz usando `.env.example` como referência:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUBSTITUA_AQUI
```

Nunca envie `.env.local`, senha do banco, Secret key ou `service_role` ao GitHub.

## 5. Criar o banco e as regras

No Supabase:

`SQL Editor → New query`

Cole todo o conteúdo de:

`supabase/schema.sql`

Clique em `Run`.

O SQL cria:

- perfis com papéis `member`, `vip` e `admin`;
- perfil automático para cada nova conta;
- tabela de conteúdos VIP;
- regras RLS;
- bucket privado `vip-files`;
- políticas para impedir acesso comum aos arquivos VIP.

## 6. Configurar URLs do Supabase Auth

No Supabase:

`Authentication → URL Configuration`

Use:

```text
Site URL:
https://app-jean-na-estrada-next.vercel.app
```

Adicione em Redirect URLs:

```text
http://localhost:3000/**
https://app-jean-na-estrada-next.vercel.app/**
```

## 7. Conferir variáveis na Vercel

Na Vercel:

`Project → Settings → Environment Variables`

Confirme estas duas variáveis em Production, Preview e Development:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Depois faça um Redeploy ou envie um novo commit.

## 8. Testar localmente

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

Teste:

```text
http://localhost:3000/diagnostico
http://localhost:3000/api/health
http://localhost:3000/cadastro
http://localhost:3000/entrar
http://localhost:3000/membros
http://localhost:3000/vip
```

## 9. Criar a primeira conta

Cadastre sua conta pelo próprio JNE App. Se a confirmação de e-mail estiver ativa no Supabase, abra o e-mail e confirme.

Depois, no SQL Editor, substitua o endereço no comando abaixo pelo e-mail da sua conta:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'SEU_EMAIL_AQUI'
);
```

Não transforme outras contas em administradoras.

## 10. Publicar na Vercel

```powershell
git add .
git commit -m "feat: adicionar autenticacao e area VIP"
git push origin develop
```

A Vercel fará o deploy automaticamente. O GitHub Pages da branch `main` continuará intacto.

## Observação sobre o PWA

Páginas públicas continuam usando cache. Login, conta, VIP, diagnóstico, rotas de autenticação e API foram excluídos do cache para impedir que dados privados sejam armazenados ou exibidos para outra sessão.
