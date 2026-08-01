# Testes da versão 1.5.3

- O build não deve listar `/admin/youtube`.
- O build não deve listar `/membros/youtube`.
- O build não deve listar `/api/youtube/*`.
- O build não deve listar `/api/cron/youtube-memberships`.
- O build deve continuar listando `/api/cron/youtube-notification`.
- `/videos` deve continuar funcionando.
- O player interno deve continuar abrindo vídeos.
- O painel de membros deve permitir origem manual `youtube`.
- `/api/health` deve mostrar `youtubeMembershipAutomation: "removed"`.
