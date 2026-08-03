# Instalação — JNE App 1.19.0

1. Comece na branch limpa `release/1.18.0`, versão `1.18.0`.
2. Execute o instalador incluído no pacote para criar `release/1.19.0`.
3. Execute somente `supabase/migrations/1.19.0_driver_automations_notifications.sql` no SQL Editor do Supabase.
4. Confirme que a Vercel possui `CRON_SECRET` com um valor forte. `AUTOMATION_CRON_SECRET` é opcional para chamadas administrativas externas e também é aceito pelo endpoint.
5. Execute o teste automatizado incluído no pacote.
6. Faça commit e push somente depois da aprovação do build e dos testes locais.
7. No Preview, valide `/motorista/notificacoes` em smartphone e `/admin/automacoes` com uma conta administrativa.

Não execute o arquivo `supabase/schema.sql` completo em produção.

O cron diário de `/api/automacoes/run` está configurado no `vercel.json`. O endpoint sem segredo ou com segredo incorreto deve responder HTTP 401.
