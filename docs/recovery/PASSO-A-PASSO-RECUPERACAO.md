# Recuperação limpa do JNE App

## 1. Criar uma pasta nova

Não extraia por cima do projeto quebrado. Crie uma pasta nova, por exemplo:

```text
C:\Users\jean_\JNE-App-Recuperacao
```

Extraia todo o conteúdo deste ZIP dentro dela. O arquivo `package.json` deve ficar diretamente na raiz da nova pasta.

## 2. Abrir no VS Code

No VS Code:

```text
Arquivo → Abrir Pasta → JNE-App-Recuperacao
```

Abra um novo terminal integrado e confirme a pasta:

```powershell
Get-Location
Get-ChildItem package.json
```

## 3. Conferir Node e npm

```powershell
node -v
npm -v
```

Use Node.js 22 ou 24. O projeto não foi preparado para Node 20 ou anterior.

## 4. Criar o arquivo de ambiente

```powershell
Copy-Item .env.local.example .env.local
```

Abra `.env.local` e preencha as mesmas variáveis cadastradas na Vercel. Não publique esse arquivo no GitHub.

Variáveis principais:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
CRON_SECRET
```

## 5. Instalar do zero

```powershell
npm cache verify
npm install
```

O `npm install` criará `node_modules` e `package-lock.json` novos.

## 6. Limpar e gerar o build

```powershell
npm run clean
npm run typecheck
npm run build
```

Se terminar sem erro:

```powershell
npm start
```

Abra:

```text
http://localhost:3000
```

## 7. Testes essenciais

Teste nesta ordem:

1. `/api/health` — deve mostrar `version: 1.6.1.1`.
2. Página inicial.
3. Carrossel principal.
4. Página `/videos`.
5. Clique em um vídeo — deve abrir o YouTube.
6. Login e cadastro.
7. Área de membros.
8. Área VIP.
9. Comunidade.
10. Motorista profissional e financeiro.
11. Notificações.

## 8. Limpar cache do navegador/PWA

Depois de iniciar o projeto, abra o Chrome em `http://localhost:3000`:

```text
F12 → Application → Service Workers → Unregister
F12 → Application → Storage → Clear site data
```

Feche a aba e abra novamente. Também pode testar em uma janela anônima.

## 9. Criar um novo repositório de recuperação

Depois de confirmar que o projeto está funcionando:

```powershell
git init
git add .
git commit -m "Recuperação limpa do JNE App 1.6.1.1"
git branch -M main
git remote add origin URL_DO_NOVO_REPOSITORIO
git push -u origin main
```

Não envie `.env.local`, `.next` ou `node_modules`.

## 10. Publicar na Vercel

Crie um projeto novo na Vercel usando o novo repositório. Copie as variáveis do projeto antigo para o novo projeto e faça o deploy.

Antes de trocar o domínio principal, teste o endereço temporário fornecido pela Vercel.
