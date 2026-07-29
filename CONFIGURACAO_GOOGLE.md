# Google Cloud e YouTube — configuração do JNE App

## 1. Criar o projeto

No Google Cloud Console, crie um projeto chamado:

```text
JNE App
```

Ative a API:

```text
YouTube Data API v3
```

## 2. Configurar o Google Auth Platform

Na área Google Auth Platform, preencha:

```text
Nome do app: JNE App
Página inicial: https://jneapp.app
Política de Privacidade: https://jneapp.app/privacidade
Domínio autorizado: jneapp.app
```

Use um e-mail de suporte que você acompanhe.

Durante o beta, deixe o público como `External` e o status como `Testing`. Adicione sua Conta Google e as contas dos beta testers como usuários de teste.

## 3. Escopos

Cadastre apenas os escopos usados pelo aplicativo:

```text
openid
email
https://www.googleapis.com/auth/youtube.readonly
https://www.googleapis.com/auth/youtube.channel-memberships.creator
```

O escopo `youtube.readonly` identifica os canais associados à conta do membro. O escopo `youtube.channel-memberships.creator` é usado somente na conexão administrativa do proprietário do canal.

## 4. Criar o cliente OAuth

Crie um cliente do tipo:

```text
Web application
```

Adicione os redirecionamentos autorizados:

```text
https://jneapp.app/api/youtube/admin/callback
https://jneapp.app/api/youtube/member/callback
```

Para desenvolvimento local, adicione também:

```text
http://localhost:3000/api/youtube/admin/callback
http://localhost:3000/api/youtube/member/callback
```

Copie o Client ID e o Client Secret para as variáveis da Vercel. Nunca coloque o Client Secret em variável `NEXT_PUBLIC_`.

## 5. Acesso ao serviço de membros

O endpoint de membros não é liberado automaticamente para todos os projetos. O próprio YouTube orienta criadores individuais a solicitar acesso por meio do representante Google/YouTube.

Enquanto a liberação não ocorrer:

- a autorização OAuth pode funcionar;
- a consulta de canais pode funcionar;
- a sincronização de membros pode retornar erro de permissão;
- convites e liberações manuais continuam disponíveis.

Use o suporte ao criador dentro do YouTube Studio para solicitar orientação sobre o acesso à Members API. Guarde a explicação objetiva do uso:

> O JNE App usa a Members API exclusivamente para confirmar membros atuais do canal Jean na Estrada e entregar o benefício externo da área VIP. Os dados não são vendidos nem usados para publicidade.

## 6. Primeira conexão

Após o deploy:

```text
https://jneapp.app/admin/youtube
```

1. Clique em `Conectar canal`.
2. Escolha a Conta Google proprietária do canal Jean na Estrada.
3. Confirme as permissões.
4. Volte ao painel.
5. Clique em `Sincronizar agora`.

O valor de `YOUTUBE_CHANNEL_ID` impede que outro canal seja conectado por engano.

## 7. Teste de membro

1. Sincronize o canal no painel administrativo.
2. Entre no JNE App com uma conta de teste.
3. Abra `/membros/youtube`.
4. Vincule a Conta Google que possui a assinatura.
5. Confirme o acesso à área VIP.
6. Remova o vínculo e confira se somente a origem YouTube foi desativada.
