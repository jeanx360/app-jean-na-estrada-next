# Plano de lançamento — JNE App 2.0.0

## Etapa 1 — candidato

- aplicar a release em `release/2.0.0`;
- executar testes completos;
- validar Preview;
- revisar smartphone pequeno;
- validar documentos e preços;
- corrigir somente falhas de lançamento.

## Etapa 2 — piloto controlado

- liberar para um grupo pequeno de usuários conhecidos;
- acompanhar cadastro, aceite, instalação e suporte;
- registrar dúvidas recorrentes;
- observar reservas, orçamentos e notificações sem alterar dados;
- confirmar capacidade operacional do suporte.

## Etapa 3 — produção

- promover a branch aprovada;
- confirmar domínio;
- verificar health;
- criar tag de lançamento;
- publicar comunicação oficial;
- acompanhar logs, erros, cadastro e suporte nas primeiras horas.

## Critérios para interromper o lançamento

- falha de autenticação;
- exposição de dados privados;
- RLS incorreta;
- perda ou alteração indevida de registros;
- indisponibilidade recorrente;
- erro de versão ou cache que impeça atualização;
- cobrança ou condição comercial apresentada incorretamente.

## Reversão

A base anterior preservada é `release/1.20.0`, commit de origem registrado no pacote da fonte. A reversão deve usar Git e Vercel sem reescrever o histórico.
