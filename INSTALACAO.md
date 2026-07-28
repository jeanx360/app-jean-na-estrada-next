# Correção 0.7.1 — sessão, download e cache PWA

## Problemas corrigidos

- Voltar do download não deixa a tela VIP.
- Login não permanece no histórico do navegador.
- Usuário autenticado não volta para uma tela de login antiga.
- Service Worker antigo é removido automaticamente durante `npm run dev`.
- HTML e respostas privadas deixam de ser armazenados no cache PWA.
- Requisições internas do App Router/RSC não são interceptadas pelo Service Worker.
- Script inicial de tema passa a usar `next/script`.
- Endpoint de download recebe `Cache-Control: no-store`.

## Instalação

1. Copie as pastas `src` e `public` deste pacote para a raiz do projeto.
2. Confirme a substituição dos arquivos.
3. Atualize a versão:

```powershell
npm version 0.7.1 --no-git-tag-version
```

4. Apague o build anterior:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
```

5. Execute:

```powershell
npm run build
npm run dev
```

## Limpeza única no navegador

Depois de abrir `http://localhost:3000`, pressione `F12` e faça:

1. Application → Service Workers → Unregister.
2. Application → Storage → Clear site data.
3. Feche a aba e abra o endereço novamente.

O novo código também faz essa limpeza automaticamente em desenvolvimento, mas a limpeza manual garante que o worker antigo não controle a primeira carga.
