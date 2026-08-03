# Testes — JNE App 2.0.2

O script automático valida:

- branch e versões `2.0.2`;
- arquivos esperados do payload;
- ausência de resíduos do instalador;
- marcadores do cadastro único;
- bloqueio das páginas para visitantes;
- APIs de mapas protegidas;
- token assinado de rota;
- preenchimento da estimativa no orçamento;
- `git diff --check`;
- TypeScript;
- build de produção;
- health e rotas públicas;
- redirecionamento de uma rota protegida;
- resposta 401 de APIs protegidas sem sessão.

## Validação manual no smartphone

1. Abrir Home, Vídeos e Notícias sem login.
2. Tentar abrir Guia ou perfil de motorista e confirmar o pedido de conta gratuita.
3. Criar uma conta como passageiro e confirmar o retorno à página original.
4. Criar uma conta de teste como motorista e confirmar perfil profissional, veículo e placa no mesmo fluxo.
5. No perfil de motorista, solicitar orçamento usando localização/endereço.
6. Confirmar que nome e WhatsApp aparecem preenchidos.
7. Confirmar que distância e tempo aparecem quando mapas estiverem configurados.
8. Abrir a solicitação como motorista e criar orçamento; distância e duração devem estar preenchidas.
9. Testar uma rota frequente cadastrada no catálogo do motorista.
10. Confirmar que a placa não aparece no cartão público.
