$ErrorActionPreference = "Stop"

if (-not (Test-Path "package.json")) {
  Write-Error "Abra o terminal na raiz do projeto, onde está o package.json."
}

Write-Host "Removendo rotas antigas da automação de membros do YouTube..." -ForegroundColor Cyan
npm run cleanup:legacy-youtube

Write-Host "Limpando o build anterior..." -ForegroundColor Cyan
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

Write-Host "Atualização 1.6.2 aplicada. Agora execute: npm install e npm run build" -ForegroundColor Green
