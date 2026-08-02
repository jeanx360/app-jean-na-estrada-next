# Testes — JNE App 1.8.0

## Build

- `npm run build` sem erro;
- `/api/health` retorna `version: "1.8.0"`;
- `public/sw.js` usa `jne-app-v1.8.0`.

## Identidade

- logo JNE App aparece no cabeçalho sem deformação;
- favicon aparece na aba do navegador;
- ícone 192 abre corretamente;
- ícone 512 abre corretamente;
- ícone maskable não corta o símbolo;
- Apple Touch Icon tem fundo opaco;
- instalação da PWA exibe a nova marca.

## Regressão mínima

- início;
- aplicativos;
- manuais;
- perfil público anônimo;
- QR e link compartilhado;
- reserva pública;
- painel do motorista;
- administração.

## Cache

Em aparelhos com a PWA já instalada, pode ser necessário remover a instalação antiga, limpar os dados do site e instalar novamente para que o sistema operacional atualize o ícone.
