# Instalação do hotfix 1.7.3.1

Extraia o ZIP na raiz oficial do projeto:

`C:\Users\jean_\app-jean-na-estrada-next`

Confirme a substituição do arquivo existente e execute:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run build
```
