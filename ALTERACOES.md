# JNE App 1.4.4

## Calculadora EV

- Campos numéricos agora aceitam ficar totalmente vazios durante a edição.
- O zero não é mais inserido automaticamente ao apagar um valor.
- Compatibilidade com vírgula ou ponto decimal.
- Teclado numérico/decimal adequado em smartphones.
- Valores vazios são tratados como zero somente nos cálculos, sem alterar o texto digitado.

## Segurança e isolamento de sessão

- Respostas que podem renovar cookies de autenticação recebem `Cache-Control: private, no-store`.
- Incluídos cabeçalhos específicos para impedir cache no CDN da Vercel.
- Respostas variam por cookie e pelo estado de navegação do Next.js.
- Layout renderizado dinamicamente para impedir reaproveitamento de conteúdo de sessão.
- Mantido um cliente Supabase novo por requisição.
- Cache PWA atualizado para 1.4.4.
