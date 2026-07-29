# Alterações — JNE App 1.4.0

## Comunidade VIP

- Feed exclusivo para VIPs e administradores.
- Categorias administráveis.
- Publicações com texto e uma imagem privada.
- Enquetes com 2 a 6 opções.
- Curtidas em publicações e comentários.
- Comentários e respostas em um nível.
- Denúncias de spam, abuso, desinformação, direitos autorais e outros motivos.
- Interações internas para comentários, respostas e ações de moderação.
- Pesquisa global de publicações para usuários autorizados.

## Administração

- Painel `/admin/comunidade`.
- Fixação, bloqueio, ocultação, restauração e exclusão de publicações.
- Ocultação, restauração e exclusão de comentários.
- Fila de denúncias.
- Restrição temporária ou sem prazo para publicar e comentar.

## Segurança

- RLS em todas as tabelas da comunidade.
- Verificação direta da validade do acesso VIP.
- Bucket privado `community-images`, limitado a JPG, PNG e WebP de até 5 MB.
- Links temporários para imagens.
- Campos de moderação protegidos por triggers.
- Ações administrativas registradas nos logs do painel.
- Rotas da comunidade excluídas do cache offline para impedir exposição de conteúdo privado.
- Perfis públicos da comunidade expostos apenas por RPC com campos mínimos.
- Limite de seis opções por enquete e um voto por usuário.

## Interface e documentos

- Comunidade incluída na navegação desktop e mobile.
- Banner da comunidade na área VIP.
- Benefício incluído na página de assinatura.
- Termos de Uso versão 1.2.0.
- Política de Privacidade versão 1.3.0.
- Cache PWA atualizado para 1.4.0.
