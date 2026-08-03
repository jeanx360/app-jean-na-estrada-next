# Instalação — JNE App 2.0.1

## Base obrigatória

- pasta: `C:\Users\jean_\app-jean-na-estrada-next`;
- branch limpa: `release/2.0.0`;
- versão sincronizada: `2.0.0` em `package.json` e `package-lock.json`;
- ambiente: Windows PowerShell 5.1.

## Aplicação do pacote

1. Extraia o ZIP fora da raiz do projeto, por exemplo em `Downloads`.
2. Execute `INSTALAR_JNE_APP_2.0.1.ps1` pelo PowerShell.
3. O instalador valida a base, os hashes e cria a branch `release/2.0.1`.
4. O payload é copiado a partir de uma área temporária em `%TEMP%`.
5. Nenhum arquivo `_jne_payload` ou `_jne_install` é deixado na raiz do projeto.

## Migration

Não existe migration nesta versão.

## Próxima etapa

Depois da instalação, execute `TESTAR_JNE_APP_2.0.1.ps1` e envie o log completo caso qualquer validação falhe.
