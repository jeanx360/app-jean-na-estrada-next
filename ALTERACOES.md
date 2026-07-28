# JNE App 0.7.1

- Corrige version skew entre HTML 0.6.0 e JavaScript 0.7.0.
- Evita hydration mismatch causado por cache PWA antigo.
- Remove Service Workers e caches JNE durante desenvolvimento.
- Não armazena HTML, sessão, login, VIP, admin, APIs ou RSC no Service Worker.
- Abre downloads VIP em outra aba.
- Troca o redirect de login para `replace`.
- Redireciona usuário já autenticado para fora de `/entrar`.
- Usa `next/script` no bootstrap de tema.
