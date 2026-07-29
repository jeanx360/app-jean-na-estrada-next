# Estratégia de pagamento do JNE App VIP

## Fase inicial recomendada

### Opção principal: Plano de Assinatura do Mercado Pago

1. Crie um plano mensal no Mercado Pago.
2. Copie o link público do plano.
3. No JNE App, abra `/admin/assinatura`.
4. Informe o valor exibido e cole o link.
5. O membro abre o pagamento pelo aplicativo e depois envia a referência ou comprovante.
6. A administração confere no Mercado Pago e aprova o pedido.

O JNE App não coleta dados de cartão. O pagamento ocorre no ambiente do provedor.

### Alternativa: Pix manual

1. Ative o Pix no painel.
2. Cadastre tipo de chave, chave, titular e instruções.
3. O membro realiza o Pix e envia o comprovante.
4. A administração aprova e define a validade do VIP.

## Observação sobre alteração de preço

O valor alterado dentro do JNE App muda somente a apresentação e o valor registrado nos novos pedidos. Quando existir um plano no Mercado Pago, o preço também deve ser alterado no próprio provedor.

## Evolução futura

Uma versão posterior poderá integrar a API e os webhooks do provedor para aprovar, renovar, pausar e cancelar assinaturas automaticamente.
