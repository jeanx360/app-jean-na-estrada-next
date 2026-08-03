# Instalação — JNE App 2.0.0

## Base obrigatória

- branch: `release/1.20.0`;
- versão: `1.20.0`;
- Git limpo;
- branch local sincronizada com o GitHub.

## Aplicação

O instalador:

1. valida a base;
2. verifica manifesto e hashes SHA-256;
3. cria `release/2.0.0`;
4. copia somente os arquivos listados no payload;
5. confirma as versões do `package.json` e `package-lock.json`;
6. informa que não existe migration da release.

## Supabase

Não execute SQL para a 2.0.0.

A atualização das versões legais usa a tabela de aceites já existente.

## Depois da aplicação

Execute o script:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$temp\_jne_install\TESTAR_JNE_APP_2.0.0.ps1"
```

O teste executa validações estáticas, `git diff --check`, build completo e testes HTTP locais.
