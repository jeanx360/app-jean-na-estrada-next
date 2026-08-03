# JNE App 2.0.0 — preparação comercial e lançamento

## Objetivo

Transformar a base funcional construída até a 1.20.0 em um candidato de lançamento comercial, sem criar outro módulo operacional grande e sem integrar cobrança automática.

## Principais entregas

### Primeiros passos

- nova rota pública `/comecar`;
- caminhos separados para conteúdo, comunidade e motorista profissional;
- leitura do estado real da conta, aceite legal, modo motorista e plano atual;
- atalhos para perfil, instalação, planos e suporte;
- novo cadastro direcionado para o aceite e onboarding.

### Central de ajuda

- nova rota `/suporte`;
- respostas sobre cadastro, senha, planos, motorista, instalação, atualização e privacidade;
- caminhos rápidos para recursos de autoatendimento;
- orientação clara para atendimento humano;
- aviso para nunca compartilhar senha ou segredo.

### Instalação PWA

- nova rota `/instalar`;
- botão conectado ao fluxo real de instalação do PWA;
- instruções para Android, iPhone e computador;
- explicação sobre atualização, uso offline e endereço oficial;
- manifesto com `id`, `scope`, categorias e atalhos.

### Comercial e identidade

- domínio padrão alterado para `https://jneapp.app`;
- metadados atualizados para o produto completo;
- página inicial com chamada de primeiros passos e planos;
- página Sobre atualizada para a versão 2.0;
- navegação e rodapé com onboarding, planos, instalação e suporte;
- remoção de cartões que ainda apresentavam recursos já entregues como “próxima etapa”.

### Cadastro e documentos

- confirmação obrigatória de leitura de Termos e Privacidade no cadastro;
- confirmação de e-mail direcionada para o aceite formal e onboarding;
- Termos de Uso atualizados para a versão 2.0.0;
- Política de Privacidade atualizada para a versão 2.0.0;
- usuários existentes precisarão confirmar as versões atualizadas;
- nenhuma migration nova é necessária para o aceite.

### Qualidade e segurança

- páginas de erro e 404 com caminhos de ajuda;
- tela offline revisada;
- suporte a `prefers-reduced-motion`;
- melhorias responsivas para telas pequenas;
- cabeçalhos de HSTS e DNS prefetch;
- cache PWA atualizado para `jne-app-v2.0.0`;
- health com marcadores de onboarding, suporte e candidato comercial.

## Banco de dados

Esta release não cria tabelas, colunas, funções ou políticas novas.

Não existe migration da 2.0.0 para executar no Supabase.

## Limites preservados

- sem gateway de pagamento;
- sem cobrança automática;
- sem despacho automático de corridas;
- sem envio automático de WhatsApp, SMS ou e-mail;
- sem alteração de dados reais durante a instalação;
- sem remoção de migrations anteriores.

## Revisão jurídica

Os documentos foram alinhados ao funcionamento real do produto. Antes de uma divulgação comercial ampla, recomenda-se revisão profissional específica dos textos jurídicos e das condições comerciais definitivas.
