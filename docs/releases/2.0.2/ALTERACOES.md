# JNE App 2.0.2 — Simplificação do passageiro e do motorista

## Objetivo

Reduzir etapas no primeiro acesso e tornar o pedido de orçamento mais próximo da experiência que passageiros já conhecem em aplicativos de mobilidade, sem transformar o JNE App em uma plataforma automática de despacho.

## Cadastro único

- cadastro gratuito em uma única tela;
- pergunta direta: **Você é motorista profissional?**;
- para motorista, modelo do veículo e placa entram no mesmo fluxo;
- o perfil profissional inicial é criado como rascunho após a confirmação do e-mail;
- placa guardada somente nos metadados privados da conta;
- perfil, WhatsApp, veículo e foto podem ser mantidos juntos em **Meu perfil**;
- o usuário volta ao destino que tentou acessar depois do login, cadastro e aceite legal.

## Conteúdo sem cadastro

A navegação anônima fica limitada a:

- Home;
- Vídeos;
- Notícias;
- páginas operacionais necessárias para login, cadastro, confirmação e documentos legais.

As demais áreas exigem ao menos uma conta gratuita. As regras VIP existentes continuam inalteradas.

## Pedido de orçamento do passageiro

- origem e destino em primeiro plano;
- opção de usar a localização atual;
- busca assistida de endereços;
- cálculo de distância e duração estimada;
- nome e WhatsApp preenchidos com os dados da conta quando disponíveis;
- passageiros, bagagens, tipo de viagem e observações ficam em uma seção opcional;
- distância e duração validadas no servidor por token assinado;
- os valores calculados chegam ao orçamento profissional do motorista já preenchidos;
- sem integração configurada, os endereços continuam funcionando de forma manual.

## Rotas frequentes

A estrutura já existente de **serviços do motorista** passa a ser apresentada ao passageiro como **Rotas e serviços frequentes**. Assim o motorista pode cadastrar opções como Porto Alegre–Gramado ou Torres–Porto Alegre sem introduzir um segundo catálogo.

## Segurança e privacidade

- chave de mapas somente no servidor;
- APIs de endereço e rota exigem usuário autenticado;
- token de estimativa expira e é validado antes de influenciar duração ou orçamento;
- placa do veículo não é publicada;
- páginas protegidas não são armazenadas pelo Service Worker;
- atribuição visível do Google Maps e documentos legais atualizados para localização/endereço;
- nenhuma migration SQL nesta versão.
