# JNE App 1.7.6 — fluxo inicial do cartão do motorista

## Alteração

Ao criar o cartão profissional pela primeira vez:

1. o perfil é salvo;
2. aparece a mensagem:
   `Cartão do motorista salvo. Abrindo seu QR Code...`;
3. o botão muda para `Abrindo QR...`;
4. após 1,2 segundo, o motorista é direcionado automaticamente para:
   `/motorista/cartao`.

A tela de destino apresenta o QR Code e as opções de baixar, copiar, compartilhar e abrir o perfil.

## Edição posterior

Quando um cartão já existente é editado, o comportamento anterior é mantido: o perfil é salvo e a tela de edição permanece aberta.
