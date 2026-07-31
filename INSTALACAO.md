# Instalação — JNE App 1.6.1

1. Extraia o conteúdo deste pacote.
2. Copie as pastas e arquivos para a raiz do projeto `app-jean-na-estrada-next`.
3. Confirme a substituição/mesclagem dos arquivos existentes.
4. Não é necessário executar SQL nesta versão.
5. No PowerShell, execute:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run build
npm run dev
```

6. Abra `http://localhost:3000/api/health` e confirme:

```json
{
  "ok": true,
  "service": "jne-app",
  "version": "1.6.1"
}
```

Depois dos testes locais, faça commit, push e aguarde o deploy da Vercel.
