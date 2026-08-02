# Instalação do patch 1.6.2

1. Extraia o ZIP na raiz do projeto e substitua os arquivos.
2. Execute `npm run cleanup:legacy-youtube` para apagar as rotas antigas que um ZIP não consegue remover por sobreposição.
3. Execute `Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue`.
4. Execute `npm install`.
5. Execute `npm run build`.
6. Execute `npm start`.
7. Teste o menu lateral, o menu do perfil e `/api/health`.

O `.env.local` não deve ser removido.
