# Documentação do JNE App

A documentação histórica fica fora da raiz para manter o projeto legível e facilitar a operação de cada release.

## Estrutura

- `releases/`: alterações, instalação e testes por versão;
- `recovery/`: instruções e artefatos antigos de recuperação;
- `operations/`: checklists, suporte e procedimentos de lançamento;
- `audits/`: auditorias administrativas e técnicas.

## Regras

- novas releases devem usar `docs/releases/<versão>/`;
- arquivos temporários, logs, ZIPs e builds não devem ser versionados;
- migrations continuam em `supabase/migrations/`;
- código da aplicação continua em `src/`;
- segredos e arquivos `.env` nunca devem entrar nos pacotes.

## Releases recentes

- [2.0.0 — Preparação comercial e lançamento](./releases/2.0.0/ALTERACOES.md)
- [1.20.0 — Painel executivo e administração](./releases/1.20.0/ALTERACOES.md)
- [1.19.0 — Automações e notificações](./releases/1.19.0/ALTERACOES.md)
- [1.18.0 — Rede de motoristas e indicações](./releases/1.18.0/ALTERACOES.md)
- [1.17.0 — Planos e monetização](./releases/1.17.0/ALTERACOES.md)
- [1.10.0 — Inteligência do motorista](./releases/1.10.0/ALTERACOES.md)
