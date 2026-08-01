# Instalação — JNE App 1.7.1

## 1. Pare o servidor

No terminal do VS Code:

```powershell
Ctrl + C
```

## 2. Extraia o patch

Extraia o ZIP na raiz do projeto e aceite substituir os arquivos.

## 3. Atualize o Supabase

No painel do Supabase:

1. Abra **SQL Editor**.
2. Clique em **New query**.
3. Abra no projeto o arquivo:
   `supabase/migrations/1.7.1_driver_public_profile_reservations.sql`
4. Copie todo o conteúdo.
5. Cole no SQL Editor.
6. Clique em **Run**.
7. Confirme que terminou sem erro.

Execute apenas esse arquivo de migração. Não execute o `schema.sql` no banco atual.

## 4. Instale as novas dependências

```powershell
npm install
```

## 5. Limpe e faça o build

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run build
```

Confirme:

```powershell
Test-Path .next\BUILD_ID
```

O resultado deve ser `True`.

## 6. Inicie

```powershell
npm start
```

Abra:

- `http://localhost:3000/motorista`
- `http://localhost:3000/api/health`

A versão esperada é `1.7.1`.

## Observação sobre notificações

No ambiente local, o alerta interno pode ser testado normalmente. Web Push depende das chaves VAPID e de permissão do navegador. Em produção, o site precisa estar em HTTPS. O som da notificação fechada é controlado pelo sistema do celular; quando o app estiver aberto, o JNE App também tenta reproduzir um alerta próprio.
