# Testes — JNE App 1.7.6

## Primeiro cartão

Use um motorista profissional que ainda não tenha registro em `driver_public_profiles`.

1. Acesse `/motorista/perfil-publico`.
2. Preencha as três etapas.
3. Salve o cartão.
4. Confirme a mensagem:
   `Cartão do motorista salvo. Abrindo seu QR Code...`
5. Confirme o redirecionamento automático para `/motorista/cartao`.
6. Confirme que o QR Code e as opções de compartilhamento são exibidos.

## Edição de cartão existente

1. Abra novamente `/motorista/perfil-publico`.
2. Altere um dado.
3. Salve.
4. Confirme que a edição é salva sem redirecionamento automático.

## Regressão

- validar o link público anônimo;
- validar o QR Code;
- validar o compartilhamento pelo WhatsApp;
- validar o formulário de solicitação de corrida.
