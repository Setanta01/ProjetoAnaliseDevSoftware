# backend/api/urls.py

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views
from .views_mfa import (
    google_login,       # ✓
    mfa_status,         # ✓
    mfa_setup_totp,     # ✓
    mfa_verify_totp,    # ✓
    mfa_setup_email,    # ✓
    mfa_verify_email,   # ✓
    mfa_challenge,      # ✓
    mfa_resend_email,   # ✓
    mfa_disable,        # ✓
)

urlpatterns = [

    # ──────────────────────────────────────────────────────────────────────────
    # 1. AUTENTICAÇÃO
    # ──────────────────────────────────────────────────────────────────────────

    # GET/POST de primeiro boot; o POST fica indisponível após a primeira conta.
    path('auth/bootstrap-status/',           views.auth_bootstrap_status,    name='auth_bootstrap_status'),
    path('auth/bootstrap-admin/',            views.auth_bootstrap_admin,     name='auth_bootstrap_admin'),

    # POST  /auth/login/           → email+senha; retorna JWT ou mfa_required
    #   ~  renomear custom_token_obtain → auth_login no views.py
    path('auth/login/',                     views.auth_login,               name='auth_login'),

    # POST  /auth/google/          → OAuth Google
    path('auth/google/',                    google_login,                   name='auth_google'),

    # POST  /token/                → SimpleJWT padrão (mantido para compatibilidade)
    path('token/',                          views.custom_token_obtain,      name='token_obtain'),

    # POST  /token/refresh/        → renova access token
    path('token/refresh/',                  TokenRefreshView.as_view(),     name='token_refresh'),

    # POST  /auth/logout/          → invalida JTI na tabela sessoes
    #   ✗  criar view auth_logout
    path('auth/logout/',                    views.auth_logout,              name='auth_logout'),

    # POST  /auth/ativar-convite/  → ativa conta via token de convite
    #   ✗  criar view auth_ativar_convite
    path('auth/ativar-convite/',            views.auth_ativar_convite,      name='auth_ativar_convite'),
    path('auth/convite-info/', views.auth_convite_info, name='auth_convite_info'),

    # POST  /auth/recuperar-senha/ → dispara e-mail com link de recuperação
    #   ✗  criar view auth_recuperar_senha
    path('auth/recuperar-senha/',           views.auth_recuperar_senha,     name='auth_recuperar_senha'),

    # POST  /auth/redefinir-senha/ → atualiza senha via token de recuperação
    #   ✗  criar view auth_redefinir_senha
    path('auth/redefinir-senha/',           views.auth_redefinir_senha,     name='auth_redefinir_senha'),

    # GET   /auth/profile/         → dados do usuário logado
    # PUT   /auth/profile/         → atualiza nome e campos básicos
    #   ~  mover de /profile/ para /auth/profile/ e suportar PUT
    path('auth/profile/',                   views.auth_profile,             name='auth_profile'),

    # POST  /auth/profile/alterar-senha/
    #   ✗  criar view auth_alterar_senha
    path('auth/profile/alterar-senha/',     views.auth_alterar_senha,       name='auth_alterar_senha'),

    # ──────────────────────────────────────────────────────────────────────────
    # 2. MFA
    # ──────────────────────────────────────────────────────────────────────────

    path('mfa/status/',                     mfa_status,                     name='mfa_status'),
    path('mfa/challenge/',                  mfa_challenge,                  name='mfa_challenge'),
    path('mfa/resend-email/',               mfa_resend_email,               name='mfa_resend_email'),
    path('mfa/disable/',                    mfa_disable,                    name='mfa_disable'),
    path('mfa/setup/totp/',                 mfa_setup_totp,                 name='mfa_setup_totp'),
    path('mfa/verify/totp/',                mfa_verify_totp,                name='mfa_verify_totp'),
    path('mfa/setup/email/',                mfa_setup_email,                name='mfa_setup_email'),
    path('mfa/verify/email/',               mfa_verify_email,               name='mfa_verify_email'),

    # ──────────────────────────────────────────────────────────────────────────
    # 3. ADMINISTRAÇÃO GLOBAL
    # ──────────────────────────────────────────────────────────────────────────

    # POST  /admin/convites/       → gera convite e envia e-mail
    #   ✗  criar view admin_convites
    path('admin/convites/',                 views.admin_convites,           name='admin_convites'),
    path('admin/convites/<int:convite_id>/reenviar/', views.admin_convite_reenviar, name='admin_convite_reenviar'),

    # GET   /admin/usuarios/       → lista todos os usuários
    path('admin/usuarios/',                 views.admin_usuarios,           name='admin_usuarios'),

    # PATCH /admin/usuarios/<id>/  → ativa/desativa ou altera flag admin
    #   ✗  criar view admin_usuario_detail
    path('admin/usuarios/<int:usuario_id>/', views.admin_usuario_detail,   name='admin_usuario_detail'),

    # GET   /admin/stats/          → métricas globais
    path('admin/stats/',                    views.admin_stats,              name='admin_stats'),

    # GET   /usuarios/             → usuários ativos para seleção de membros
    path('usuarios/',                       views.usuarios_list,            name='usuarios_list'),

    # GET   /admin/projetos/       → lista todos os projetos (visão admin)
    # POST  /admin/projetos/       → cria projeto + colunas Kanban padrão
    #   ✗  criar view admin_projetos
    path('admin/projetos/',                 views.admin_projetos,           name='admin_projetos'),

    # DELETE /admin/projetos/<id>/ → soft delete (arquivado=True), dupla confirmação
    #   ✗  criar view admin_projeto_detail
    path('admin/projetos/<int:projeto_id>/', views.admin_projeto_detail,   name='admin_projeto_detail'),

    # ──────────────────────────────────────────────────────────────────────────
    # 4. PROJETOS
    # ──────────────────────────────────────────────────────────────────────────

    # GET   /projetos/             → projetos do usuário logado (via projeto_membros)
    path('projetos/',                       views.projetos_list,            name='projetos_list'),

    # GET   /projetos/<id>/        → detalhes, membros e sprints ativas
    # PUT   /projetos/<id>/        → atualiza nome/descrição ou arquiva
    # PATCH /projetos/<id>/
    path('projetos/<int:projeto_id>/',      views.projeto_detail,           name='projeto_detail'),

    # ──────────────────────────────────────────────────────────────────────────
    # 4.1 MEMBROS DO PROJETO
    # ──────────────────────────────────────────────────────────────────────────

    # GET   /projetos/<id>/membros/   → lista membros e seus cargos
    # POST  /projetos/<id>/membros/   → vincula usuário com cargo
    #   ✗  criar view projeto_membros
    path('projetos/<int:projeto_id>/membros/',
         views.projeto_membros,                                             name='projeto_membros'),

    # PATCH  /projetos/<id>/membros/<user_id>/  → altera cargo
    # DELETE /projetos/<id>/membros/<user_id>/  → remove membro
    #   ✗  criar view projeto_membro_detail
    path('projetos/<int:projeto_id>/membros/<int:usuario_id>/',
         views.projeto_membro_detail,                                       name='projeto_membro_detail'),

    # ──────────────────────────────────────────────────────────────────────────
    # 4.2 COLUNAS DO BOARD
    # ──────────────────────────────────────────────────────────────────────────

    # GET /projetos/<id>/colunas/  → lista colunas Kanban fixas ordenadas por posicao
    #   ✗  criar view projeto_colunas
    path('projetos/<int:projeto_id>/colunas/',
         views.projeto_colunas,                                             name='projeto_colunas'),

    # ──────────────────────────────────────────────────────────────────────────
    # 5. SPRINTS
    # ──────────────────────────────────────────────────────────────────────────

    # GET   /projetos/<id>/sprints/  → histórico + ativa + planejada
    # POST  /projetos/<id>/sprints/  → cria sprint PLANEJADA (máx 1 ativa + 1 planejada)
    #   ✗  criar view projeto_sprints
    path('projetos/<int:projeto_id>/sprints/',
         views.projeto_sprints,                                             name='projeto_sprints'),

    # POST /sprints/<id>/iniciar/  → status → ATIVA, registra data_inicio
    #   ✗  criar view sprint_iniciar
    path('sprints/<int:sprint_id>/iniciar/',
         views.sprint_iniciar,                                              name='sprint_iniciar'),

    # GET  /sprints/<id>/          → árvore completa (cards, checklists, flags)
    #   ✗  criar view sprint_detail
    path('sprints/<int:sprint_id>/',        views.sprint_detail,            name='sprint_detail'),

    # POST /sprints/<id>/encerrar/ → status → ENCERRADA, distribui pendências
    #   ✗  criar view sprint_encerrar
    path('sprints/<int:sprint_id>/encerrar/',
         views.sprint_encerrar,                                             name='sprint_encerrar'),

    # ──────────────────────────────────────────────────────────────────────────
    # 6. BACKLOG
    # ──────────────────────────────────────────────────────────────────────────

    # GET /projetos/<id>/backlog/  → cards sem sprint_id, ordenados por prioridade
    #   ✗  criar view projeto_backlog
    path('projetos/<int:projeto_id>/backlog/',
         views.projeto_backlog,                                             name='projeto_backlog'),

    # ──────────────────────────────────────────────────────────────────────────
    # 7. CARDS
    # ──────────────────────────────────────────────────────────────────────────

    # POST /projetos/<id>/cards/   → cria TAREFA ou BUG
    #   ✗  criar view projeto_cards
    path('projetos/<int:projeto_id>/cards/',
         views.projeto_cards,                                               name='projeto_cards'),

    # GET  /cards/                 → lista geral; ?responsavel=me filtra próprios
    #   ✗  criar view cards_list  (nota: remover tasks/ ao migrar frontend)
    path('cards/',                          views.cards_list,               name='cards_list'),

    # GET    /cards/<id>/          → detalhes completos
    # PATCH  /cards/<id>/          → atualiza campos, move coluna, altera responsável
    # DELETE /cards/<id>/          → remove card
    #   ✗  criar view card_detail
    path('cards/<int:card_id>/',            views.card_detail,              name='card_detail'),

    # GET /cards/<id>/historico/   → registros de auditoria do card
    #   ✗  criar view card_historico
    path('cards/<int:card_id>/historico/',  views.card_historico,           name='card_historico'),

    # POST /cards/<id>/marcar-visto/ → limpa flags de novidade para o usuário
    #   ✗  criar view card_marcar_visto
    path('cards/<int:card_id>/marcar-visto/',
         views.card_marcar_visto,                                           name='card_marcar_visto'),

    # ──────────────────────────────────────────────────────────────────────────
    # 7.1 ESTIMATIVAS (Planning Poker)
    # ──────────────────────────────────────────────────────────────────────────

    # POST /cards/<id>/estimativas/enviar/  → marca pronto_para_estimativa, notifica
    #   ✗  criar view card_estimativa_enviar
    path('cards/<int:card_id>/estimativas/enviar/',
         views.card_estimativa_enviar,                                      name='card_estimativa_enviar'),

    # GET  /cards/<id>/estimativas/ → votos (próprio antes da revelação; todos após)
    # POST /cards/<id>/estimativas/ → submete voto secreto
    #   ✗  criar view card_estimativas
    path('cards/<int:card_id>/estimativas/',
         views.card_estimativas,                                            name='card_estimativas'),

    # POST /cards/<id>/estimativas/revelar/ → revela votos e salva consolidada
    #   ✗  criar view card_estimativa_revelar
    path('cards/<int:card_id>/estimativas/revelar/',
         views.card_estimativa_revelar,                                     name='card_estimativa_revelar'),

    # ──────────────────────────────────────────────────────────────────────────
    # 7.2 CHECKLISTS
    # ──────────────────────────────────────────────────────────────────────────

    # GET  /cards/<id>/checklists/ → lista checklists e itens
    # POST /cards/<id>/checklists/ → cria checklist no card
    #   ✗  criar view card_checklists
    path('cards/<int:card_id>/checklists/',
         views.card_checklists,                                             name='card_checklists'),

    # PATCH  /cards/checklists/<id>/ → atualiza título ou posição
    # DELETE /cards/checklists/<id>/ → remove checklist e itens
    #   ✗  criar view checklist_detail
    path('cards/checklists/<int:checklist_id>/',
         views.checklist_detail,                                            name='checklist_detail'),

    # POST /cards/checklists/<id>/itens/ → adiciona item ao checklist
    #   ✗  criar view checklist_itens
    path('cards/checklists/<int:checklist_id>/itens/',
         views.checklist_itens,                                             name='checklist_itens'),

    # PATCH  /cards/checklists/itens/<id>/ → marca concluído/pendente ou edita texto
    # DELETE /cards/checklists/itens/<id>/ → remove item
    #   ✗  criar view checklist_item_detail
    path('cards/checklists/itens/<int:item_id>/',
         views.checklist_item_detail,                                       name='checklist_item_detail'),

    # ──────────────────────────────────────────────────────────────────────────
    # 7.3 VÍNCULOS ENTRE CARDS
    # ──────────────────────────────────────────────────────────────────────────

    # GET  /cards/<id>/vinculos/ → lista vínculos (origem e destino)
    # POST /cards/<id>/vinculos/ → cria vínculo com tipo_vinculo
    #   ✗  criar view card_vinculos
    path('cards/<int:card_id>/vinculos/',   views.card_vinculos,            name='card_vinculos'),

    # DELETE /cards/vinculos/<id>/ → remove vínculo
    #   ✗  criar view vinculo_detail
    path('cards/vinculos/<int:vinculo_id>/',
         views.vinculo_detail,                                              name='vinculo_detail'),

    # ──────────────────────────────────────────────────────────────────────────
    # 7.4 COMENTÁRIOS
    # ──────────────────────────────────────────────────────────────────────────

    # GET  /cards/<id>/comentarios/ → lista em ordem cronológica
    # POST /cards/<id>/comentarios/ → cria, notifica participantes
    #   ✗  criar view card_comentarios
    path('cards/<int:card_id>/comentarios/',
         views.card_comentarios,                                            name='card_comentarios'),

    # PATCH  /cards/comentarios/<id>/ → edita próprio comentário
    # DELETE /cards/comentarios/<id>/ → remove próprio (ou qualquer, se Gerente)
    #   ✗  criar view comentario_detail
    path('cards/comentarios/<int:comentario_id>/',
         views.comentario_detail,                                           name='comentario_detail'),

    # ──────────────────────────────────────────────────────────────────────────
    # 7.5 ANEXOS
    # ──────────────────────────────────────────────────────────────────────────

    # POST /cards/<id>/anexos/     → upload direto no card
    path('cards/<int:card_id>/anexos/',     views.card_anexos,              name='card_anexos'),

    # POST /cards/comentarios/<id>/anexos/ → upload num comentário específico
    path('cards/comentarios/<int:comentario_id>/anexos/',
         views.comentario_anexos,                                           name='comentario_anexos'),

    # DELETE /cards/anexos/<id>/   → remove anexo
    path('cards/anexos/<int:anexo_id>/',    views.anexo_detail,             name='anexo_detail'),

    # ──────────────────────────────────────────────────────────────────────────
    # 7.6 VALIDAÇÃO QA
    # ──────────────────────────────────────────────────────────────────────────

    # GET  /cards/<id>/validacao/  → histórico de validações
    # POST /cards/<id>/validacao/  → QA registra APROVADO ou REPROVADO
    path('cards/<int:card_id>/validacao/',  views.card_validacao,           name='card_validacao'),

    # ──────────────────────────────────────────────────────────────────────────
    # 8. IMPEDIMENTOS
    # ──────────────────────────────────────────────────────────────────────────

    # POST   /cards/<id>/impedimento/ → marca impedido=True (exige comentario)
    # DELETE /cards/<id>/impedimento/ → remove impedimento
    path('cards/<int:card_id>/impedimento/',
         views.card_impedimento,                                            name='card_impedimento'),
]
