# Instalação da versão 1.7.0.1

1. Pare o servidor com `Ctrl + C`.
2. Extraia o patch na raiz do projeto e substitua os arquivos.
3. Execute:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run build
Test-Path .next\BUILD_ID
npm start
```

4. Abra `http://localhost:3000/noticias`.
5. Teste também `http://localhost:3000/api/news`.
6. A rota `/api/health` deve informar `1.7.0.1`.
