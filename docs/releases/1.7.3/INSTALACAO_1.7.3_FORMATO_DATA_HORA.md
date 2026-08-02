# Instalação — padrão brasileiro de data e hora

1. Extraia o ZIP diretamente na raiz oficial do projeto:

```text
C:\Users\jean_\app-jean-na-estrada-next
```

2. Confirme a substituição dos arquivos.

3. Execute no PowerShell:

```powershell
Set-Location C:\Users\jean_\app-jean-na-estrada-next
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run build
```

4. Após o build, confirme:

```powershell
Test-Path .next\BUILD_ID
```

O resultado esperado é `True`.

Não execute nenhuma migration SQL.
