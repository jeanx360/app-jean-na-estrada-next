# JNE App 2.0.1 — Estabilização e polimento

## Objetivo

Corrigir problemas funcionais e visuais encontrados após a publicação da versão 2.0.0, mantendo os módulos concluídos e sem adicionar ainda a conversa interna entre motorista e passageiro.

## Correções incluídas

### Conta e perfil

- reorganização responsiva do card **Conta protegida**;
- botões **Editar perfil** e **Alterar senha** com largura e alinhamento consistentes no smartphone;
- sincronização da foto da conta com `driver_public_profiles`;
- remoção da foto também refletida no perfil público;
- formulário público passa a usar a foto oficial atual, sem recuperar uma URL antiga em cache lógico.

### Instalação PWA

- detecção compartilhada de execução em modo `standalone` ou `fullscreen`;
- compatibilidade com `navigator.standalone` no iOS;
- persistência do evento `appinstalled`;
- atualização do checklist ao retornar para a página, recuperar foco ou mudar o modo de exibição;
- estado visual **Aplicativo instalado** no onboarding.

### Navegação

- novo componente reutilizável `SmartBackButton`;
- retorno pelo histórico válido da sessão;
- fallback específico por módulo em acessos diretos ou novas abas;
- inclusão de botão Voltar em páginas secundárias que ainda usavam links fixos;
- preservação da aparência da barra administrativa.

### Pesquisa e manuais

- atualização do catálogo sempre que a pesquisa global é aberta;
- deduplicação por categoria, título e destino, evitando que manuais com o mesmo título substituam uns aos outros;
- busca por todos os termos digitados, tolerante a espaços, hífens, caixa e acentos;
- indexação de marca, modelo, slug, versão compacta, anos, tipo, idioma, fonte, título e descrição;
- suporte específico para variações como `EX5`, `EX 5`, `Geely EX5` e `Geely EX5 BEV`;
- documentos publicados sem data programada também são aceitos na biblioteca.

### Mobile

- espaço inferior adicional no perfil público do motorista para impedir que a barra fixa cubra os botões e o conteúdo;
- uso de `safe-area-inset-bottom` em aparelhos compatíveis.

## Banco de dados

Esta versão **não possui migration SQL**.

## Fora do escopo

- conversa interna motorista–passageiro;
- alteração do fluxo comercial ou de reservas;
- mudanças nas versões dos Termos e da Política de Privacidade.
