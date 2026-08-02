# Instalação da JNE App 1.11.0

1. Comece na branch limpa `release/1.10.0`, com o projeto na versão `1.10.0`.
2. Execute o instalador do pacote fora da raiz do projeto.
3. O instalador cria `release/1.11.0`, copia os arquivos e coloca a migration no clipboard.
4. Execute somente `supabase/migrations/1.11.0_driver_marketing_links.sql` no SQL Editor do Supabase.
5. Execute o build e os testes locais antes de commit, push ou deploy.

Não execute `supabase/schema.sql` em produção. Ele existe apenas como referência consolidada do projeto.
