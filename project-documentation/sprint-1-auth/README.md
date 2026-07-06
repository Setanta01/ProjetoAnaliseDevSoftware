# Auth Documentation

Esta pasta concentra os documentos especificos de autenticacao, convite,
primeiro acesso, recuperacao de senha, MFA e entrega de e-mail.

## Documentos

- `LOCAL_SETUP_AND_AUTH_FLOW.md`: setup local e fluxo operacional de auth/e-mail.
- `AUTH_FLOW_TRACKER.md`: tracker de conclusao dos fluxos de auth.
- `AUTH_AND_EMAIL_STABILIZATION_COMPLETED.md`: plano historico concluido de
  estabilizacao de auth e e-mail.
- `AUTH_EMAIL_GIT_BASELINE_HISTORY.md`: historico de baseline Git usado antes
  da troca para SMTP assíncrono.
- `LOCAL_SECRETS.md`: referencia local de segredos/ids. Deve continuar sem
  valores sensiveis versionados.

## Observacao

As regras de produto que afetam outros modulos continuam nos documentos
canonicos da raiz de `project-documentation`, principalmente
`fluxos_de_uso.md`, `endpoints-resumido.md`, `Documento de Arquitetura de Software.md`
e `AGENTS.md`.

## Email-Triggering Events

The backend currently queues e-mail for these events:

- `POST /api/auth/login/` when the user has `mfa_tipo == 'EMAIL'`: sends the MFA OTP.
- `POST /api/auth/recuperar-senha/`: sends the password recovery link if the account exists and is active.
- `POST /api/auth/profile/alterar-senha/`: sends a confirmation that the password changed.
- `POST /api/admin/convites/`: sends a new invitation e-mail.
- `POST /api/admin/convites/<id>/reenviar/`: requeues the same valid invitation.
- `POST /api/mfa/setup/email/`: sends the MFA enrollment OTP.
- `POST /api/mfa/resend-email/`: requeues a fresh MFA OTP for challenge flow.
- `POST /api/cards/<id>/comentarios/`: notifies the responsible user and prior commenters on the card.
- `POST /api/cards/<id>/estimativas/enviar/`: notifies DEV and QA members that the card is open for Planning Poker.
- `POST /api/cards/<id>/validacao/`: notifies the responsible user about QA approval or rejection.
- `POST /api/cards/<id>/impedimento/`: notifies project managers that the card is blocked.
- `DELETE /api/projetos/<id>/membros/<user_id>/`: notifies the project managers when the removed member had assigned cards.

These are the current product-level email triggers; other interactions use notifications, cache invalidation, or inline UI state instead of e-mail.
