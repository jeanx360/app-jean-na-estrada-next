# JNE App 1.6.1

## Resumo mensal do motorista

- O resumo mensal agora considera somente viagens com status **Concluída**.
- Viagens planejadas continuam no histórico, mas não distorcem faturamento, despesas, horas, quilômetros ou resultado líquido do mês.
- O mês é calculado no fuso `America/Sao_Paulo`, evitando diferença na virada do mês entre o navegador e a Vercel.
- Criação de viagem, mudança de status, inclusão e exclusão de lançamentos agora invalidam o painel e a tela financeira do Next.js.
- Ao concluir uma viagem, o sistema confirma que o resumo mensal foi atualizado.

## Notificações

- O sino agora abre um menu flutuante compacto, sem tirar o usuário da tela atual.
- Exibe as seis notificações recentes com categoria, data, título, resumo e ação.
- Ao abrir o menu, todas as notificações disponíveis são marcadas como lidas automaticamente.
- O contador do sino é limpo imediatamente e sincronizado para usuários autenticados ou visitantes.
- Clique fora ou pressione `Esc` para fechar.
- O histórico completo continua disponível pelo botão no rodapé do menu.

## Banco de dados

Esta versão não exige uma nova migração SQL.
