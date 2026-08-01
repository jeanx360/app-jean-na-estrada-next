# Instalação

Extraia o ZIP na raiz oficial:

`C:\Users\jean_\app-jean-na-estrada-next`

Confirme a substituição dos arquivos e execute:

```powershell
Set-Location C:\Users\jean_\app-jean-na-estrada-next
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run build
```

Após o build, confirme:

```powershell
Test-Path .next\BUILD_ID
```

O resultado esperado é `True`.
