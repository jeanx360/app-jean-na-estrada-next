# Instalação

Extraia o ZIP na raiz oficial do projeto:

`C:\Users\jean_\app-jean-na-estrada-next`

Confirme a substituição dos arquivos.

Depois execute no PowerShell:

```powershell
Set-Location C:\Users\jean_\app-jean-na-estrada-next
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run build
Test-Path .next\BUILD_ID
```

O resultado esperado do último comando, após um build bem-sucedido, é `True`.
