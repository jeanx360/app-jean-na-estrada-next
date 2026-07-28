# JNE App 0.8.0 — painel de conteúdo público

## 1. Instalar os arquivos

Use a branch `develop` e copie o conteúdo deste pacote para a raiz do projeto.

```powershell
git checkout develop
git status
```

## 2. Executar a migração no Supabase

No Supabase:

1. Abra o projeto `jneapp`.
2. Entre em **SQL Editor**.
3. Clique em **New query**.
4. Abra localmente `supabase/migrations/0.8.0_public_cms.sql`.
5. Copie todo o conteúdo para o editor.
6. Clique em **Run**.

Resultado esperado: `Success. No rows returned`.

A migração cria:

- tabela `public_contents`;
- políticas RLS;
- bucket público `public-assets`;
- restrições de upload para administradores;
- conteúdo inicial migrado da versão estática.

## 3. Conferir no painel

No **Table Editor**, confirme `public_contents`.

No **Storage**, confirme o bucket `public-assets` como público.

## 4. Atualizar a versão

```powershell
npm version 0.8.0 --no-git-tag-version
```

Não há novas dependências.

## 5. Validar

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

Teste:

```text
http://localhost:3000/admin/publicacoes
http://localhost:3000/tutoriais
http://localhost:3000/aplicativos
http://localhost:3000/parceiros
http://localhost:3000/produtos
```

## 6. Fluxo recomendado

1. Envie uma imagem no bloco **Imagens públicas**.
2. A imagem será aplicada ao formulário automaticamente.
3. Crie um parceiro, tutorial, aplicativo ou produto.
4. Abra a página pública correspondente.
5. Edite a publicação.
6. Teste despublicar e publicar novamente.

## 7. Publicar na Vercel

```powershell
git add .
git commit -m "feat: adicionar gestao de conteudo publico"
git push origin develop
```
