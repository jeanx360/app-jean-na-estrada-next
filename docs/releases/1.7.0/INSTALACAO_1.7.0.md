# Instalação do patch 1.7.0

1. Pare o servidor com `Ctrl + C`.
2. Extraia o ZIP na raiz do projeto e substitua os arquivos.
3. Execute:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run build
```

4. Confirme:

```powershell
Test-Path .next\BUILD_ID
```

5. Inicie:

```powershell
npm start
```

6. Abra `http://localhost:3000/api/health` e confirme a versão `1.7.0`.
