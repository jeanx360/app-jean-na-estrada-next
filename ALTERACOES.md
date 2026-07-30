# JNE App 1.5.2

## Correção do player do YouTube

- Trocado o host do player para o endereço oficial `www.youtube.com/embed`.
- Adicionado o parâmetro `origin` com o domínio real do JNE App.
- Adicionado `widget_referrer` com a página que iniciou a reprodução.
- Mantida a política `strict-origin-when-cross-origin` no iframe.
- Removido o parâmetro obsoleto `modestbranding`.
- Adicionada validação do ID do vídeo e fallback seguro.
- Atualizado o cache do PWA para 1.5.2.
