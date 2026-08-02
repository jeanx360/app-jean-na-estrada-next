# Testes do JNE App 1.7.7

## Aplicativos

1. Publique um aplicativo com imagem.
2. Confirme que a imagem aparece como banner grande, e não dentro do ícone.
3. Confirme que o ícone universal continua visível abaixo da capa.
4. Publique ou visualize um aplicativo sem imagem.
5. Confirme que ele continua no formato compacto anterior.
6. Confira a convivência de cards com e sem imagem no desktop.
7. Repita o teste no celular.
8. Teste o botão de acesso ou download dos dois formatos.

## Edição de veículos

1. Acesse `/admin/manuais`.
2. Localize `Veículos cadastrados`.
3. Clique em `Editar veículo`.
4. Confirme que marca, nome, identificador, imagem, ordem e publicação são carregados.
5. Altere o nome ou a ordem e salve.
6. Confirme que o mesmo veículo foi atualizado, sem duplicação.
7. Confirme que os manuais vinculados continuam aparecendo.
8. Substitua a imagem e confira a nova prévia.
9. Teste `Cancelar edição`.

## Regressão

- cadastro de nova marca;
- cadastro de novo veículo;
- cadastro e edição de manual;
- publicação e edição de aplicativo;
- página `/aplicativos`;
- página `/parceiros`;
- página `/guia`;
- `/api/health` exibindo `1.7.7`;
- navegação no desktop e no celular.
