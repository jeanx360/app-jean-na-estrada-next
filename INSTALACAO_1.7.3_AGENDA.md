# Instalação

Extraia o ZIP na raiz oficial:

`C:\Users\jean_\app-jean-na-estrada-next`

Depois execute:

```powershell
Set-Location C:\Users\jean_\app-jean-na-estrada-next
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run build
Test-Path .next\BUILD_ID
```

O resultado final esperado do último comando é `True`.
