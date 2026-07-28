# JNE App 0.8.0 — conteúdo público administrável

- Cria a tabela `public_contents` no Supabase.
- Migra o conteúdo atual de tutoriais, aplicativos, parceiros e produtos para o banco.
- Adiciona painel `/admin/publicacoes`.
- Permite criar, editar, publicar, despublicar, ordenar e excluir publicações.
- Cria bucket público `public-assets` com upload restrito a administradores.
- Permite enviar banners de parceiros sem editar o código.
- Faz as páginas públicas lerem o Supabase com fallback para os dados estáticos.
- Mantém RLS: visitantes leem somente conteúdo publicado; administradores gerenciam tudo.
- Atualiza a versão visual e o cache PWA para 0.8.0.
