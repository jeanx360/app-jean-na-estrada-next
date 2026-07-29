# Instalação — JNE App 1.2.1

1. Extraia o pacote.
2. Copie as pastas `src` e `public` para a raiz do projeto.
3. Confirme a substituição dos arquivos.
4. Atualize a versão:

```powershell
npm version 1.2.1 --no-git-tag-version
```

5. Limpe o build anterior e compile:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
```

6. Teste localmente:

```powershell
npm run dev
```

## Testes obrigatórios

- Abra a pesquisa em um smartphone ou no modo responsivo.
- Confirme que o painel fica por cima de toda a tela.
- Pesquise termos com vários resultados e role a lista até o final.
- Feche a pesquisa pelo X, pelo fundo no desktop e pela tecla Escape.
- Confirme que o bloco de notificações não aparece mais na home.
- Confirme que o sino do cabeçalho continua funcionando.
- Deixe o carrossel percorrer todos os slides e verifique que sua altura não muda.

Não existe SQL novo nesta versão.
