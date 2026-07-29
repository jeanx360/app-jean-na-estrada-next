# JNE App 1.4.0 — Comunidade VIP

## 1. Base necessária

Instale esta atualização sobre a versão **1.3.1** já validada.

## 2. Copiar os arquivos

Copie as pastas `src`, `public` e `supabase` deste pacote para a raiz do projeto e confirme as substituições.

## 3. Atualizar o banco

No Supabase, abra **SQL Editor → New query**, copie todo o conteúdo de:

`supabase/migrations/1.4.0_vip_community.sql`

e execute uma única vez.

Resultado esperado: `Success. No rows returned`.

## 4. Atualizar a versão e compilar

```powershell
npm version 1.4.0 --no-git-tag-version
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

## 5. Rotas de teste

- `/comunidade`
- `/comunidade/novo`
- `/comunidade/notificacoes`
- `/admin/comunidade`
- `/vip`
- `/assinar`

## 6. Testes por perfil

### Administrador

- Criar, desativar e reativar categorias.
- Fixar, bloquear, ocultar, restaurar e excluir publicações.
- Analisar denúncias.
- Restringir postagem ou comentário de um membro.

### VIP

- Criar publicação com e sem imagem.
- Criar enquete de 2 a 6 opções.
- Curtir, comentar, responder e votar.
- Denunciar publicação ou comentário.
- Conferir interações recebidas.

### Membro comum

- Confirmar que `/comunidade` redireciona para `/assinar`.

## 7. Aceite legal

Os Termos de Uso e a Política de Privacidade receberam novas versões. O novo aceite é intencional. A correção 1.3.1 preserva o cargo de administrador durante esse processo.
