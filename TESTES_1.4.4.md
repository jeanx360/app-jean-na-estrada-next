# Testes — JNE App 1.4.4

## Calculadora

1. Abra `/calculadora`.
2. Apague completamente cada campo.
3. Confirme que ele fica vazio, sem voltar para `0`.
4. Digite um novo valor normalmente.
5. Teste `6,5` e `6.5` em campos decimais.
6. Confirme os resultados após restaurar o exemplo.

## Sessões isoladas

1. Saia de todas as sessões antigas e feche o navegador.
2. Na janela normal, entre com a conta A.
3. Abra uma janela InPrivate/anônima e entre com a conta B.
4. Atualize `/perfil`, `/membros`, `/vip` e `/admin` em ambas.
5. A janela normal deve continuar na conta A.
6. A janela privada deve continuar na conta B.
7. Saia de uma janela e confirme que a outra permanece conectada.
8. Repita após alguns minutos para forçar renovação do token.

## Cabeçalhos

No DevTools > Network, abra uma resposta HTML e confirme:

- `cache-control: private, no-store, no-cache, max-age=0, must-revalidate`
- `vercel-cdn-cache-control: no-store`
- `vary` contendo `Cookie`
