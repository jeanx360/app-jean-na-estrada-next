# Instalação — JNE App 1.1.0

Esta atualização não instala novas bibliotecas e não altera as chaves do ambiente.

## 1. Crie uma branch de trabalho a partir da versão 1.0 validada

No terminal, confirme que você está na branch que contém a versão 1.0 usada no beta:

```powershell
git branch --show-current
git status
```

Com o projeto limpo, crie a branch da atualização:

```powershell
git checkout -b feature/1.1.0
```

Se essa branch já existir, use:

```powershell
git checkout feature/1.1.0
```

## 2. Copie os arquivos

Extraia o ZIP e copie todo o conteúdo da pasta `jneapp-v1.1.0-library-apps-carousel` para a raiz do projeto:

```text
C:\Users\jean_\app-jean-na-estrada-next
```

Confirme a substituição dos arquivos.

## 3. Execute a migração no Supabase

Abra no VS Code:

```text
supabase/migrations/1.1.0_library_carousel.sql
```

Copie todo o conteúdo e execute em:

```text
Supabase → SQL Editor → New query → Run
```

Resultado esperado:

```text
Success. No rows returned
```

A migração cria:

```text
vehicle_brands
vehicle_models
vehicle_documents
home_carousel_slides
```

E os buckets privados:

```text
vehicle-documents
app-files
```

Também cadastra como base as marcas BYD, Geely e GWM e os modelos Dolphin, EX2 e Ora 03, sem adicionar manuais fictícios.

## 4. Atualize a versão

```powershell
npm version 1.1.0 --no-git-tag-version
```

## 5. Valide o build

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
```

Se passar:

```powershell
npm run dev
```

## 6. Teste a biblioteca de manuais

Abra:

```text
http://localhost:3000/admin/manuais
```

Fluxo recomendado:

1. Cadastre ou use uma marca existente.
2. Cadastre ou use um veículo existente.
3. Envie um PDF pelo uploader.
4. Cadastre um manual com anos compatíveis.
5. Teste um documento público.
6. Teste outro documento marcado como VIP.
7. Abra `http://localhost:3000/guia#manuais`.
8. Altere marca, veículo e ano.
9. Confirme que o público abre o documento público e vê bloqueio no VIP.
10. Confirme que uma conta VIP abre os dois.

## 7. Teste os aplicativos

Abra:

```text
http://localhost:3000/admin/publicacoes
```

Teste os dois formatos:

- Aplicativo externo com URL oficial.
- Arquivo hospedado usando o uploader de APK/pacote.

Depois abra:

```text
http://localhost:3000/aplicativos
```

Confirme versão, origem, compatibilidade, tamanho, checksum, acesso público e VIP.

## 8. Configure o carrossel

Abra:

```text
http://localhost:3000/admin/home
```

Teste:

- Mensagem personalizada.
- Último vídeo automático.
- Última notícia automática.
- Parceiro ou publicação cadastrada.
- Ordem de exibição.
- Publicar e ocultar.
- Início e término programados.

Depois confira a página inicial no computador e no celular.

## 9. Publicar

Depois de concluir os testes:

```powershell
git add .
git commit -m "feat: adicionar biblioteca de manuais apps completos e carrossel"
git push -u origin feature/1.1.0
```

Valide o preview criado pela Vercel. Depois faça o merge na branch atualmente vinculada ao `jneapp.app`. Exemplo, caso seja `release/1.0.0`:

```powershell
git checkout release/1.0.0
git pull origin release/1.0.0
git merge feature/1.1.0
git push origin release/1.0.0
```

## Observações

- Não execute novamente migrações antigas.
- Não torne os buckets `vehicle-documents` ou `app-files` públicos.
- Não envie `.env.local` ao GitHub.
- Use arquivos e manuais com origem identificada e distribuição autorizada.
