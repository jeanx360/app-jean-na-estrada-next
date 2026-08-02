# JNE App 1.7.7

## Aplicativos com imagem

- A imagem enviada manualmente deixa de substituir o ícone pequeno.
- Aplicativos com imagem passam a exibir uma capa grande no topo do card.
- No desktop, cards com capa ocupam toda a largura da grade, seguindo o padrão visual da área de parceiros.
- No celular, a capa se adapta à largura da tela.
- O ícone universal continua aparecendo no corpo do card.
- Aplicativos sem imagem permanecem no formato compacto atual.
- Cards com e sem imagem podem coexistir na mesma página.

## Administração de aplicativos

- O campo passou a ser identificado como `Imagem de capa opcional`.
- A tela explica que aplicativos sem imagem mantêm o ícone universal.
- A área de upload informa que também serve para capas de aplicativos.

## Edição de veículos da biblioteca de manuais

- A administração de manuais agora mostra uma seção com todos os veículos cadastrados.
- Cada veículo possui o botão `Editar veículo`.
- A edição preserva o mesmo ID do veículo e, portanto, mantém os manuais já vinculados.
- Podem ser alterados:
  - marca;
  - nome;
  - identificador;
  - imagem;
  - ordem;
  - status de publicação.
- A imagem atual aparece em uma prévia.
- Ao substituir uma imagem armazenada, o arquivo anterior é removido do bucket `public-assets`.

## Versão

- `package.json`: 1.7.7
- `package-lock.json`: 1.7.7
- `/api/health`: 1.7.7
- cache da PWA: `jne-app-v1.7.7`

## Banco de dados

Esta versão não exige migration.
