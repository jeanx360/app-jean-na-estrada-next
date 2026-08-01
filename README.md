# JNE App — Jean na Estrada

Base de recuperação e desenvolvimento do JNE App.

## Versão atual

- Aplicativo: `1.7.2`
- PWA/cache: `jne-app-v1.7.2`
- Node.js recomendado: 22 ou 24
- Next.js: 16.2.12

## Instalação rápida

```powershell
npm install
npm run build
npm start
```

## Banco de dados

Em uma instalação que já possui a versão 1.7.1.1, execute somente:

`supabase/migrations/1.7.2_reservation_trip_documents.sql`

Não execute o `supabase/schema.sql` sobre um banco de produção existente.

## Documentação desta versão

- `ALTERACOES_1.7.2.md`
- `INSTALACAO_1.7.2.md`
- `TESTES_1.7.2.md`

## Regra de segurança

Nunca publique `.env.local`, chaves secretas do Supabase, chave VAPID privada ou `CRON_SECRET`.
