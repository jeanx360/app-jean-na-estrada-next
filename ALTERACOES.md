# JNE App 1.1.0 — Biblioteca, aplicativos e carrossel

## Biblioteca do veículo

- Mantém o conteúdo atual do Guia do iniciante.
- Adiciona seleção por marca, veículo e ano/modelo.
- Exibe manual do proprietário, manutenção, garantia, multimídia, guia rápido e documentos técnicos.
- Permite documentos públicos ou exclusivos para VIP.
- Aceita PDF hospedado no Supabase ou link externo oficial.
- Entrega PDFs privados por links temporários.
- Novo painel em `/admin/manuais` para cadastrar marcas, veículos e documentos.

## Aplicativos

- Remove o texto provisório de desenvolvimento.
- Aceita aplicativos por link externo ou arquivo hospedado.
- Aceita APK, XAPK, APKS, ZIP e outros pacotes de até 100 MB.
- Permite definir acesso público ou VIP.
- Exibe versão, origem, compatibilidade, tamanho e checksum SHA-256.
- Arquivos privados são entregues por links temporários.
- Gestão continua dentro de `/admin/publicacoes`.

## Página inicial

- Substitui o banner estático por um carrossel responsivo.
- Pode exibir mensagem personalizada, último vídeo, última notícia ou publicação cadastrada.
- Permite definir imagem, link, ordem, período de exibição e visibilidade.
- Possui rotação automática, pausa, controles, indicadores e gesto lateral no celular.
- Novo painel em `/admin/home`.

## Administração e infraestrutura

- Adiciona métricas de manuais e destaques ao painel administrativo.
- Cria buckets privados `vehicle-documents` e `app-files`.
- Cria tabelas com RLS para marcas, veículos, documentos e carrossel.
- Adiciona auditoria administrativa às novas tabelas.
- Atualiza navegação, busca visual, versão do app, diagnóstico e cache PWA para 1.1.0.
