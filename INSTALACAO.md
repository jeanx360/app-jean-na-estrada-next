# Instalação — JNE App 1.5.3

1. Copie os arquivos deste pacote para a raiz do projeto.
2. Execute `node scripts/cleanup-legacy-youtube-memberships.mjs`.
3. Atualize a versão com `npm version 1.5.3 --no-git-tag-version`.
4. Apague `.next` e execute `npm run build`.
5. Confira `/api/health` e o relatório de rotas do build.

A limpeza não remove o player de vídeos, o cron de notificações de vídeos nem as migrações históricas do Supabase.
