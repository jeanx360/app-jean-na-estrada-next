# JNE App 1.3.1 — correção de integridade dos cargos

Esta atualização impede que login, aceite de termos ou recálculo de validade VIP rebaixem uma conta administradora para membro.

## 1. Copiar arquivos

Copie `src`, `public` e `supabase` para a raiz do projeto e confirme as substituições.

## 2. Executar a migração

Execute no SQL Editor do Supabase:

`supabase/migrations/1.3.1_role_integrity_fix.sql`

## 3. Restaurar a conta principal

Execute separadamente:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = (
  select id from auth.users
  where lower(email) = lower('jean_738@msn.com')
  limit 1
)
returning id, role, is_blocked;
```

## 4. Atualizar e compilar

```powershell
npm version 1.3.1 --no-git-tag-version
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
```

## 5. Teste

1. Saia da conta.
2. Entre novamente.
3. Aceite os documentos, caso solicitado.
4. Abra `/admin`.
5. Confirme no Supabase que `role` continua `admin`.
