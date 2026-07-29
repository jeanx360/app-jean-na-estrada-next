# Instalação — JNE App 1.3.0

## 1. Copiar os arquivos

Copie todo o conteúdo deste pacote para a raiz do projeto e confirme as substituições.

## 2. Executar a migração

No Supabase, abra o SQL Editor e execute:

```text
supabase/migrations/1.3.0_manual_vip_subscriptions.sql
```

Resultado esperado:

```text
Success. No rows returned
```

## 3. Atualizar a versão e compilar

```powershell
npm version 1.3.0 --no-git-tag-version
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

## 4. Configurar a assinatura

Abra:

```text
http://localhost:3000/admin/assinatura
```

Cadastre:

- nome do plano;
- valor;
- validade padrão;
- link de assinatura recorrente;
- Pix, caso seja usado;
- status do plano.

## 5. Testar

- `/admin/membros`: conceder VIP por YouTube com validade e sem validade;
- `/assinar`: abrir o link, copiar Pix e enviar pedido;
- `/admin/assinatura`: abrir comprovante, aprovar e rejeitar;
- `/vip`: confirmar liberação e bloqueio após expiração;
- `/admin/membros`: excluir uma conta comum de teste.

## 6. Publicar

```powershell
git add .
git commit -m "feat: adicionar vip manual e assinatura direta"
git push
```

## Google OAuth

A integração automática ficou pausada e saiu da navegação e do cron. As tabelas antigas foram mantidas para uma possível retomada futura. Depois do deploy, as variáveis `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_TOKEN_ENCRYPTION_KEY` e `YOUTUBE_CHANNEL_ID` podem ser removidas da Vercel caso não sejam usadas por outra função.
