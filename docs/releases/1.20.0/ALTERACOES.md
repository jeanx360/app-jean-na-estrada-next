# JNE App 1.20.0 — Painel executivo e polimento administrativo

## Painel executivo

A rota `/admin` passa a concentrar a visão executiva da operação com dados agregados reais:

- contas ativas, bloqueadas e novas contas;
- motoristas profissionais, perfis públicos e verificados na rede;
- distribuição entre Gratuito, Profissional e Premium;
- clientes, reservas, orçamentos, viagens e indicações;
- notificações automáticas e execuções das automações;
- comparação com o período anterior;
- volume operacional por etapa;
- fila de atenção administrativa;
- evolução agregada diária, semanal ou mensal;
- exportação protegida em CSV.

Os períodos disponíveis são hoje, 7, 30 e 90 dias, mês atual e ano atual.

## Central de recursos

Todos os módulos administrativos ficam disponíveis no menu lateral e também na central de recursos do painel executivo:

- painel executivo;
- tráfego e audiência;
- membros e VIP;
- motoristas, viagens e rede;
- planos e pagamentos;
- convites VIP;
- comunidade;
- recados;
- notificações;
- publicações;
- veículos e manuais;
- página inicial;
- conteúdo VIP;
- automações internas;
- logs e auditoria.

O menu ganhou busca por nome, descrição e palavras relacionadas.

## Polimento visual

- correção dos layouts sem estilos-base em Motoristas e Comunidade;
- padronização de seções, painéis, cabeçalhos, resumos e estados vazios;
- correção de colunas apertadas em tablets;
- formulários e listas protegidos contra overflow;
- ações reorganizadas em telas pequenas;
- painéis administrativos com espaçamento, bordas e sombras consistentes;
- melhoria da navegação lateral e mobile;
- versão do rodapé administrativo centralizada no `package.json`;
- automações adicionadas à navegação administrativa oficial;
- componente antigo de navegação sincronizado com a fonte oficial.

## Banco e segurança

A migration cria duas funções administrativas protegidas:

- `admin_executive_dashboard`;
- `admin_executive_activity`.

As funções:

- exigem conta administradora;
- entregam somente agregações;
- não expõem dados pessoais de passageiros ou motoristas;
- não alteram registros;
- não calculam faturamento fiscal ou receita da plataforma;
- limitam o período máximo consultado.

## Versionamento

- aplicação: `1.20.0`;
- cache PWA: `jne-app-v1.20.0`;
- health: painel executivo administrativo ativo.
