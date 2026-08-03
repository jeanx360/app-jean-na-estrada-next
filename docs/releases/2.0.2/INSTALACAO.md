# Instalação — JNE App 2.0.2

## Base esperada

- branch: `release/2.0.1`;
- versão: `2.0.1`;
- repositório limpo;
- Windows PowerShell 5.1.

O instalador cria a branch `release/2.0.2`, valida os hashes do pacote e copia apenas os arquivos declarados no payload.

## Banco de dados

Esta versão não possui migration SQL.

## Configuração opcional do Google Maps

Sem chave, o formulário continua aceitando origem e destino digitados manualmente. Para ativar autocomplete, localização convertida em endereço e cálculo automático de rota, configure no `.env.local` e na Vercel:

```text
GOOGLE_MAPS_API_KEY=chave_somente_do_servidor
ROUTE_ESTIMATE_SECRET=segredo_longo_e_aleatorio
```

Também é aceito `MAPS_SERVER_API_KEY` como nome alternativo da chave. `ROUTE_ESTIMATE_SECRET` é recomendado; quando ausente, a chave de mapas é usada para assinar estimativas.

A integração usa cobrança por consumo. Configure faturamento, cotas e alertas no projeto da Google Cloud antes de ativá-la. Habilite os serviços usados pela implementação:

- Places API (New);
- Routes API;
- Geocoding API.

A chave não deve usar prefixo `NEXT_PUBLIC_` e não deve ser enviada ao navegador. Restrinja a chave às três APIs necessárias e mantenha cotas compatíveis com a fase beta.

## Produção

Depois de validar localmente:

1. commit e push da branch `release/2.0.2`;
2. aguardar o Preview da Vercel;
3. configurar as variáveis de mapas no ambiente de Preview/Production quando a integração for ativada;
4. validar no smartphone;
5. promover somente após aprovação.
