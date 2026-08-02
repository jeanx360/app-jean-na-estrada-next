# Instalação da versão 1.7.3

1. Pare o servidor com `Ctrl + C`.
2. Extraia o ZIP na raiz do projeto:

`C:\Users\jean_\app-jean-na-estrada-next`

3. Confirme a substituição dos arquivos.
4. Não execute nenhuma migration SQL.
5. No PowerShell, dentro da raiz do projeto:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run build
```

6. Confirme o build:

```powershell
Test-Path .next\BUILD_ID
```

7. Inicie a aplicação:

```powershell
npm start
```

8. Confira o health check:

`http://localhost:3000/api/health`

A versão esperada é `1.7.3`.
