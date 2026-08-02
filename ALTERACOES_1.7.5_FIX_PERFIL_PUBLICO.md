# JNE App 1.7.5 — correção do perfil público

Corrige o erro 404 exibido para passageiros não autenticados ao abrir:

- QR Code do cartão profissional;
- link compartilhado pelo WhatsApp;
- link público `/m/[slug]`.

## Causa

A política RLS de `driver_public_profiles` consultava `public.profiles`, mas visitantes
anônimos não possuem permissão de leitura nessa tabela.

## Solução

Foi criada uma função `SECURITY DEFINER` que retorna somente um valor booleano para
validar se o motorista está profissional, ativo e não bloqueado. Nenhum dado privado
de `public.profiles` é liberado ao visitante.
