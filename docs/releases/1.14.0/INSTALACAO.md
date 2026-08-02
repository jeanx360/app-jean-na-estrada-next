# Instalacao da JNE App 1.14.0

1. Partir da branch limpa `release/1.13.0`.
2. Executar `APLICAR_JNE_APP_1.14.0.ps1`.
3. Executar somente `supabase/migrations/1.14.0_driver_advanced_schedule.sql` no SQL Editor do Supabase.
4. Executar `TESTAR_JNE_APP_1.14.0.ps1`.
5. Fazer commit e push apenas depois de zero erros.

Nao execute `supabase/schema.sql` completo em producao.
