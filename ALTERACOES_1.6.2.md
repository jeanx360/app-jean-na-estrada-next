# JNE App 1.6.2

## Alterações

- removido o card promocional JNE App do menu lateral desktop;
- adicionado botão **Sair** no fim do menu lateral para contas autenticadas;
- adicionado menu de conta no perfil do canto superior direito, com Perfil, Configurações e Sair da conta;
- mantido o botão Entrar no menu lateral quando não há sessão;
- removidas as rotas e bibliotecas desativadas da automação de membros do YouTube;
- preservados os vídeos do canal, o cron de novos vídeos e o cadastro manual de VIP com origem YouTube;
- atualizado o cache da PWA e a rota `/api/health` para a versão 1.6.2.

Nenhuma migration SQL é necessária.
