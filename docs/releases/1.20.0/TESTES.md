# Testes da JNE App 1.20.0

O script de testes valida:

- branch e versões sincronizadas;
- arquivos obrigatórios da release;
- migration executiva e sua consolidação no schema;
- proteção administrativa das funções;
- ausência de escrita nas funções de métricas;
- períodos e comparação;
- distribuição de planos;
- fila de atenção;
- exportação CSV protegida;
- central de recursos completa;
- busca do menu administrativo;
- automações na navegação oficial;
- versão administrativa centralizada;
- estilos-base ausentes nas versões anteriores;
- responsividade e proteção contra overflow;
- cache PWA e health;
- ausência de resíduos do pacote;
- `git diff --check`;
- build completo;
- `/api/health`;
- proteção de `/admin` e da exportação sem login.

O App Router pode transmitir redirecionamentos mantendo HTTP 200. O teste aceita esse comportamento somente quando encontra um marcador real de redirecionamento e confirma que nenhum conteúdo privado foi exposto.
