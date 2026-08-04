# JNE App 2.1.1 — Mapas abertos

## Objetivo

Substituir as APIs pagas da Plataforma Google Maps por uma solução gratuita e aberta adequada ao beta fechado.

## Implementação

- OpenStreetMap para os mapas e atribuição visual;
- HeiGIT openrouteservice para rotas de carro, distância e duração;
- Pelias hospedado pela HeiGIT para autocomplete, busca e geocodificação reversa;
- chamadas ao provedor somente pelo servidor do JNE App;
- chave nunca enviada ao navegador;
- mapa leve próprio, sem biblioteca adicional e sem chave pública;
- botões externos para Google Maps e Waze preservados apenas para navegação no celular;
- fallback manual preservado quando o provedor estiver indisponível;
- camada de configuração pronta para apontar a um servidor próprio futuramente.

## Banco de dados

Nenhuma migration nova. A migration da 2.1.0 permanece válida porque os campos armazenam endereços, coordenadas, distância e duração de forma independente do provedor.

## Variáveis

```text
OPENROUTESERVICE_API_KEY
ROUTE_ESTIMATE_SECRET
```

Alternativa aceita para a chave:

```text
HEIGIT_API_KEY
```

Configuração futura opcional:

```text
OPEN_MAPS_API_BASE
NEXT_PUBLIC_MAP_TILE_URL
```
