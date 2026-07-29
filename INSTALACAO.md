# Instalação — JNE App 1.2.0

## 1. Pré-requisitos

A versão 1.1.1 deve estar funcionando antes desta atualização.

Confirme a branch de trabalho:

```powershell
git branch --show-current
git status
```

## 2. Copiar os arquivos

Copie o conteúdo desta pasta para a raiz do projeto e confirme as substituições.

## 3. Executar a migração

Abra e execute no SQL Editor do Supabase:

```text
supabase/migrations/1.2.0_youtube_vip.sql
```

Resultado esperado:

```text
Success. No rows returned
```

A migração preserva os VIP atuais e os convites já resgatados.

## 4. Configurar o Google

Siga o arquivo:

```text
CONFIGURACAO_GOOGLE.md
```

Não envie o Client Secret nem a chave de criptografia para o GitHub.

## 5. Variáveis na Vercel

Cadastre em Production, Preview e Development:

```env
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_TOKEN_ENCRYPTION_KEY=
YOUTUBE_CHANNEL_ID=UCFwFlCooeFKHSLXxkRTA70g
```

Gere a chave de criptografia:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 6. Atualizar a versão e compilar

```powershell
npm version 1.2.0 --no-git-tag-version
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
```

Depois:

```powershell
npm run dev
```

## 7. Testar

```text
http://localhost:3000/api/health
http://localhost:3000/admin/youtube
http://localhost:3000/admin/membros
http://localhost:3000/membros/youtube
```

No domínio final, confirme estes retornos no health:

```json
{
  "googleOAuthConfigured": true,
  "googleTokenEncryptionConfigured": true,
  "youtubeChannelConfigured": true
}
```

## 8. Publicar o preview

```powershell
git add .
git commit -m "feat: integrar membros do YouTube ao acesso VIP"
git push origin feature/1.1.0
```

Depois do deploy, conecte o canal em `/admin/youtube` e execute a primeira sincronização manual.
