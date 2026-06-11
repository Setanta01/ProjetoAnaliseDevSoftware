# backend/api/views.py

import secrets
from datetime import timedelta, datetime

from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.db import IntegrityError
from django.db.models import Prefetch, Q, Count
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import (
    Usuario,
    Sessao,
    ConviteSistema,
    RecuperacaoSenha,
    Projeto,
    ProjetoMembro,
    ColunasBoard,
    Sprint,
    Card,
    CardHistorico,
    CardVinculo,
    Checklist,
    ChecklistItem,
    Estimativa,
    ValidacaoQA,
    Comentario,
    Anexo,
    NotificacaoUsuario,
    JustificativaPrazo,   # FIX (#2): import no topo (eliminou import local).
)
# FIX (#9): helpers de emissão de token centralizados em mfa_utils — importados
# aqui e em views_mfa sem risco de import circular.
from .mfa_utils import enviar_otp_email, _emitir_tokens, _resposta_mfa_pendente


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS INTERNOS
# ─────────────────────────────────────────────────────────────────────────────

COLUNAS_PADRAO = [
    {'nome': 'Backlog',      'posicao': 1, 'e_inicial': True,  'e_final': False},
    {'nome': 'A Fazer',      'posicao': 2, 'e_inicial': False, 'e_final': False},
    {'nome': 'Em Progresso', 'posicao': 3, 'e_inicial': False, 'e_final': False},
    {'nome': 'Validação/QA', 'posicao': 4, 'e_inicial': False, 'e_final': False},
    {'nome': 'Concluído',    'posicao': 5, 'e_inicial': False, 'e_final': True},
]

COLUNA_VALIDACAO_NOME = 'Validação/QA'


def _cargo_no_projeto(user, projeto):
    """Retorna o cargo do usuário no projeto ('GERENTE'|'DEV'|'QA') ou None."""
    try:
        return ProjetoMembro.objects.get(usuario=user, projeto=projeto).cargo
    except ProjetoMembro.DoesNotExist:
        return None


def _eh_membro(user, projeto):
    return ProjetoMembro.objects.filter(usuario=user, projeto=projeto).exists()


def _get_projeto_ou_403(user, projeto_id):
    """
    Retorna (projeto, cargo, erro_response).
    Admin sem membership: cargo=None mas acesso permitido (checar user.admin).
    """
    try:
        projeto = Projeto.objects.get(pk=projeto_id, arquivado=False)
    except Projeto.DoesNotExist:
        return None, None, Response({'detail': 'Projeto não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    if user.admin:
        cargo = _cargo_no_projeto(user, projeto)
        return projeto, cargo, None
    cargo = _cargo_no_projeto(user, projeto)
    if cargo is None:
        return None, None, Response({'detail': 'Sem acesso a este projeto.'}, status=status.HTTP_403_FORBIDDEN)
    return projeto, cargo, None


def _registrar_historico(card, usuario, tipo, detalhe=''):
    """CardHistorico só tem 'acao' no banco — montamos a string aqui."""
    acao = f'{tipo}: {detalhe}' if detalhe else tipo
    CardHistorico.objects.create(card=card, usuario=usuario, acao=acao)


def _enviar_email(destinatario, assunto, corpo):
    """Wrapper seguro para send_mail — falha silenciosa em dev."""
    try:
        send_mail(
            assunto, corpo,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@lazuli.app'),
            [destinatario],
            fail_silently=False,
        )
    except Exception:
        pass


def _serializar_card(card, tem_novidade=False):
    """Serializa um card. Garanta select_related('coluna') antes de chamar."""
    return {
        'id': card.id,
        'titulo': card.titulo,
        'descricao': card.descricao,
        'tipo': card.tipo,
        'prioridade': card.prioridade,
        'status': card.status,
        'coluna_id': card.coluna_id,
        'sprint_id': card.sprint_id,
        'responsavel_id': card.responsavel_id,
        'responsavel_nome': card.responsavel.nome if card.responsavel else None,
        'due_date': card.due_date,
        'estimativa_consolidada': card.estimativa_consolidada,
        'impedido': card.impedido,
        'pronto_para_estimativa': card.pronto_para_estimativa,
        'tem_novidade': tem_novidade,
        'criado_em': card.criado_em,
        'atualizado_em': card.atualizado_em,
    }


def _serializar_comentario(c):
    return {
        'id': c.id,
        'texto': c.texto,
        'autor_id': c.autor_id,
        'autor_nome': c.autor.nome,
        'criado_em': c.criado_em,
        'editado_em': c.editado_em,
        'anexos': [
            {'id': a.id, 'nome': a.nome_arquivo, 'url': a.url}
            for a in c.anexos.all()
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# 1. AUTENTICAÇÃO
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def auth_login(request):
    """POST /auth/login/ — email+senha → JWT ou mfa_required."""
    email    = request.data.get('email')
    password = request.data.get('senha') or request.data.get('password')

    if not email or not password:
        return Response({'detail': 'E-mail e senha são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, email=email, password=password)
    if user is None:
        return Response({'detail': 'Credenciais inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.ativo:
        return Response({'detail': 'Conta inativa.'}, status=status.HTTP_403_FORBIDDEN)

    if user.mfa_ativo:
        if user.mfa_tipo == 'EMAIL':
            try:
                enviar_otp_email(user)
            except Exception:
                return Response({'detail': 'Falha ao enviar código MFA.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return _resposta_mfa_pendente(user)

    return Response(_emitir_tokens(user))


@api_view(['POST'])
@permission_classes([AllowAny])
def custom_token_obtain(request):
    return auth_login(request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auth_logout(request):
    """POST /auth/logout/ — invalida o refresh token atual usando a tabela sessoes."""
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            
            # Extrai o JTI (ID único do token) e a data de expiração
            jti = token['jti']
            exp_timestamp = token['exp']
            exp_dt = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)

            # Cria o registro na tabela 'sessoes' marcando como revogado
            # Isso substitui a necessidade do app 'simplejwt.token_blacklist'
            Sessao.objects.update_or_create(
                token_jti=jti,
                defaults={
                    'usuario_id': request.user.id,
                    'revogado': True,
                    'expira_em': exp_dt
                }
            )
        except TokenError:
            pass # Token inválido, não há nada a fazer
        except Exception:
            pass # Ignora outros erros para não travar o logout no cliente
            
    return Response({'detail': 'Logout realizado.'})


@api_view(['GET'])
@permission_classes([AllowAny])
def auth_convite_info(request):
    """
    GET /auth/convite-info/?token=... 
    Retorna o email e status do convite para pré-preencher o formulário.
    """
    token = request.query_params.get('token', '').strip()
    
    if not token:
        return Response({'detail': 'Token é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        convite = ConviteSistema.objects.get(token=token)
    except ConviteSistema.DoesNotExist:
        return Response({'detail': 'Convite inválido.'}, status=status.HTTP_404_NOT_FOUND)

    # Verifica validade (opcional, mas bom para feedback visual)
    if convite.usado:
        return Response({'detail': 'Este convite já foi utilizado.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if convite.expira_em and convite.expira_em < timezone.now():
        return Response({'detail': 'Este convite expirou.'}, status=status.HTTP_400_BAD_REQUEST)

    # Retorna os dados que o frontend precisa
    return Response({
        'email': convite.email,
        'admin': convite.admin,
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def auth_ativar_convite(request):
    """POST /auth/ativar-convite/ — ativa conta via token de convite."""
    token            = request.data.get('token', '').strip()
    senha            = request.data.get('senha', '')
    confirmar_senha  = request.data.get('confirmar_senha', '')

    if not token or not senha:
        return Response({'detail': 'Token e senha são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)
    if senha != confirmar_senha:
        return Response({'detail': 'As senhas não coincidem.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        convite = ConviteSistema.objects.get(token=token, usado=False)
    except ConviteSistema.DoesNotExist:
        return Response({'detail': 'Convite inválido ou já utilizado.'}, status=status.HTTP_400_BAD_REQUEST)

    if convite.expira_em and convite.expira_em < timezone.now():
        return Response({'detail': 'Convite expirado.'}, status=status.HTTP_400_BAD_REQUEST)

    # FIX (#8): impede account takeover. Não sobrescreve senha de conta já ativa.
    try:
        existente = Usuario.objects.get(email=convite.email)
        if existente.ativo:
            return Response(
                {'detail': 'Já existe uma conta ativa para este e-mail. Use a recuperação de senha.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = existente  # conta inativa → ativar
    except Usuario.DoesNotExist:
        user = Usuario.objects.create(
            email=convite.email,
            nome=convite.email.split('@')[0],
            ativo=False,
            admin=convite.admin,
        )

    user.admin = convite.admin
    user.ativo = True
    user.set_password(senha)
    user.save(update_fields=['admin', 'ativo', 'senha_hash'])

    convite.usado = True
    convite.save(update_fields=['usado'])

    return Response({'detail': 'Conta ativada com sucesso!'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_recuperar_senha(request):
    """POST /auth/recuperar-senha/ — dispara e-mail com link de recuperação."""
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({'detail': 'E-mail é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = Usuario.objects.get(email=email, ativo=True)
        token = secrets.token_urlsafe(40)
        RecuperacaoSenha.objects.create(
            usuario=user,
            token=token,
            expira_em=timezone.now() + timedelta(hours=2),
        )
        link = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/redefinir-senha?token={token}"
        _enviar_email(email, 'Recuperação de senha — Lazuli',
                      f'Clique no link para redefinir sua senha (válido por 2h):\n\n{link}')
    except Usuario.DoesNotExist:
        pass

    return Response({'detail': 'Se o e-mail existir, você receberá as instruções em breve.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def auth_redefinir_senha(request):
    """POST /auth/redefinir-senha/ — atualiza senha via token."""
    token      = request.data.get('token', '').strip()
    nova_senha = request.data.get('nova_senha', '')

    if not token or not nova_senha:
        return Response({'detail': 'Token e nova_senha são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        rec = RecuperacaoSenha.objects.select_related('usuario').get(token=token, usado=False)
    except RecuperacaoSenha.DoesNotExist:
        return Response({'detail': 'Token inválido ou já utilizado.'}, status=status.HTTP_400_BAD_REQUEST)

    if rec.expira_em < timezone.now():
        return Response({'detail': 'Token expirado.'}, status=status.HTTP_400_BAD_REQUEST)

    rec.usuario.set_password(nova_senha)
    rec.usuario.save(update_fields=['senha_hash'])
    rec.usado = True
    rec.save(update_fields=['usado'])

    return Response({'detail': 'Senha redefinida com sucesso!'})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def auth_profile(request):
    """GET|PUT /auth/profile/"""
    user = request.user

    if request.method == 'GET':
        return Response({
            'id':         user.id,
            'nome':       user.nome,
            'email':      user.email,
            'admin':      user.admin,
            'mfa_ativo':  user.mfa_ativo,
            'mfa_tipo':   user.mfa_tipo,
            'tem_google': bool(getattr(user, 'google_id', None)),
            'criado_em':  user.criado_em,
        })

    # PUT — FIX (#10): só persiste se 'nome' veio no payload.
    if 'nome' in request.data:
        user.nome = request.data['nome']
        user.save(update_fields=['nome'])
        return Response({'detail': 'Perfil atualizado.'})

    return Response({'detail': 'Nenhuma alteração enviada.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auth_alterar_senha(request):
    """POST /auth/profile/alterar-senha/"""
    user             = request.user
    senha_atual      = request.data.get('senha_atual', '')
    nova_senha       = request.data.get('nova_senha', '')
    confirmar_senha  = request.data.get('confirmar_senha', '')

    if not user.check_password(senha_atual):
        return Response({'detail': 'Senha atual incorreta.'}, status=status.HTTP_400_BAD_REQUEST)
    if nova_senha != confirmar_senha:
        return Response({'detail': 'As senhas não coincidem.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(nova_senha) < 8:
        return Response({'detail': 'A senha deve ter pelo menos 8 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(nova_senha)
    user.save(update_fields=['senha_hash'])
    _enviar_email(user.email, 'Sua senha foi alterada — Lazuli',
                  'Sua senha foi alterada com sucesso. Se não foi você, entre em contato.')
    return Response({'detail': 'Senha alterada com sucesso!'})


# ─────────────────────────────────────────────────────────────────────────────
# 2. ADMINISTRAÇÃO GLOBAL
# ─────────────────────────────────────────────────────────────────────────────

def _exige_admin(request):
    if not request.user.admin:
        return Response({'detail': 'Acesso restrito a administradores.'}, status=status.HTTP_403_FORBIDDEN)
    return None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_convites(request):
    """POST /admin/convites/ — gera convite e envia e-mail."""
    err = _exige_admin(request)
    if err:
        return err

    email = request.data.get('email', '').strip().lower()
    admin = bool(request.data.get('admin', False))

    if not email:
        return Response({'detail': 'E-mail é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    if ConviteSistema.objects.filter(email=email, usado=False).exists():
        return Response({'detail': 'Já existe um convite pendente para este e-mail.'}, status=status.HTTP_400_BAD_REQUEST)

    token = secrets.token_urlsafe(40)
    try:
        ConviteSistema.objects.create(
            email=email,
            token=token,
            admin=admin,
            criado_por=request.user,
            expira_em=timezone.now() + timedelta(hours=24),
        )
    except IntegrityError:
        return Response({'detail': 'Erro ao gerar convite. Tente novamente.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    link = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/ativar-convite?token={token}"
    _enviar_email(email, 'Você foi convidado para o Lazuli',
                  f'Clique no link para ativar sua conta (válido por 24h):\n\n{link}')

    return Response({'detail': f'Convite enviado para {email}.'}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_usuarios(request):
    """GET /admin/usuarios/ — lista todos os usuários."""
    err = _exige_admin(request)
    if err:
        return err

    usuarios = Usuario.objects.all().order_by('-criado_em')
    data = [
        {
            'id':        u.id,
            'nome':      u.nome,
            'email':     u.email,
            'admin':     u.admin,
            'ativo':     u.ativo,
            'mfa_ativo': u.mfa_ativo,
            'criado_em': u.criado_em,
        }
        for u in usuarios
    ]
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_usuario_detail(request, usuario_id):
    """PATCH /admin/usuarios/<id>/ — ativa/desativa ou altera flag admin."""
    err = _exige_admin(request)
    if err:
        return err

    try:
        usuario = Usuario.objects.get(pk=usuario_id)
    except Usuario.DoesNotExist:
        return Response({'detail': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if usuario == request.user:
        return Response({'detail': 'Você não pode alterar sua própria conta aqui.'}, status=status.HTTP_400_BAD_REQUEST)

    fields = []
    if 'ativo' in request.data:
        usuario.ativo = bool(request.data['ativo'])
        fields.append('ativo')
    if 'admin' in request.data:
        usuario.admin = bool(request.data['admin'])
        fields.append('admin')

    if fields:
        usuario.save(update_fields=fields)

    return Response({'id': usuario.id, 'ativo': usuario.ativo, 'admin': usuario.admin})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    """GET /admin/stats/ — métricas globais."""
    err = _exige_admin(request)
    if err:
        return err

    return Response({
        'total_usuarios':     Usuario.objects.filter(ativo=True).count(),
        'total_projetos':     Projeto.objects.filter(arquivado=False).count(),
        'sprints_ativas':     Sprint.objects.filter(status='ATIVA').count(),
        'total_cards':        Card.objects.count(),
        'convites_pendentes': ConviteSistema.objects.filter(usado=False).count(),
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_projetos(request):
    """GET|POST /admin/projetos/"""
    err = _exige_admin(request)
    if err:
        return err

    if request.method == 'GET':
        # FIX (#4): annotate(Count) substitui o .count() por projeto (N+1).
        projetos = (
            Projeto.objects.all()
            .annotate(num_membros=Count('projeto_membros'))
            .order_by('-criado_em')
        )
        data = [
            {
                'id':         p.id,
                'nome':       p.nome,
                'descricao':  p.descricao,
                'arquivado':  p.arquivado,
                'criado_em':  p.criado_em,
                'membros':    p.num_membros,
            }
            for p in projetos
        ]
        return Response(data)

    nome      = request.data.get('nome', '').strip()
    descricao = request.data.get('descricao', '')
    if not nome:
        return Response({'detail': 'Nome é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    projeto = Projeto.objects.create(nome=nome, descricao=descricao, criado_por=request.user)
    for col in COLUNAS_PADRAO:
        ColunasBoard.objects.create(
            projeto=projeto,
            nome=col['nome'],
            posicao=col['posicao'],
            e_inicial=col['e_inicial'],
            e_final=col['e_final'],
        )

    return Response({'id': projeto.id, 'nome': projeto.nome}, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_projeto_detail(request, projeto_id):
    """DELETE /admin/projetos/<id>/ — soft delete com dupla confirmação."""
    err = _exige_admin(request)
    if err:
        return err

    confirmar = request.data.get('confirmar', '').strip()
    if confirmar != 'CONFIRMAR':
        return Response(
            {'detail': 'Envie {"confirmar": "CONFIRMAR"} para confirmar a exclusão.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        projeto = Projeto.objects.get(pk=projeto_id)
    except Projeto.DoesNotExist:
        return Response({'detail': 'Projeto não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    projeto.arquivado = True
    projeto.save(update_fields=['arquivado'])
    return Response({'detail': 'Projeto arquivado.'})


# ─────────────────────────────────────────────────────────────────────────────
# 3. PROJETOS
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def projetos_list(request):
    """GET /projetos/ — projetos do usuário logado via projeto_membros."""
    memberships = ProjetoMembro.objects.filter(
        usuario=request.user, projeto__arquivado=False
    ).select_related('projeto').order_by('-projeto__criado_em')

    data = [
        {
            'id':        m.projeto.id,
            'nome':      m.projeto.nome,
            'descricao': m.projeto.descricao,
            'cargo':     m.cargo,
            'criado_em': m.projeto.criado_em,
        }
        for m in memberships
    ]
    return Response(data)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def projeto_detail(request, projeto_id):
    """GET|PUT|PATCH /projetos/<id>/"""
    projeto, cargo, err = _get_projeto_ou_403(request.user, projeto_id)
    if err:
        return err

    if request.method == 'GET':
        membros = ProjetoMembro.objects.filter(projeto=projeto).select_related('usuario')
        sprints_ativas = Sprint.objects.filter(projeto=projeto, status='ATIVA').values('id', 'nome')
        return Response({
            'id':           projeto.id,
            'nome':         projeto.nome,
            'descricao':    projeto.descricao,
            'arquivado':    projeto.arquivado,
            'criado_em':    projeto.criado_em,
            'meu_cargo':    cargo,
            'membros': [
                {'id': m.usuario.id, 'nome': m.usuario.nome, 'email': m.usuario.email, 'cargo': m.cargo}
                for m in membros
            ],
            'sprints_ativas': list(sprints_ativas),
        })

    if not request.user.admin and cargo != 'GERENTE':
        return Response({'detail': 'Apenas Gerentes ou Admins podem editar o projeto.'}, status=status.HTTP_403_FORBIDDEN)

    fields = []
    if 'nome' in request.data:
        projeto.nome = request.data['nome']
        fields.append('nome')
    if 'descricao' in request.data:
        projeto.descricao = request.data['descricao']
        fields.append('descricao')
    if 'arquivado' in request.data:
        projeto.arquivado = bool(request.data['arquivado'])
        fields.append('arquivado')

    if fields:
        projeto.save(update_fields=fields)

    return Response({'id': projeto.id, 'nome': projeto.nome, 'arquivado': projeto.arquivado})


# ─────────────────────────────────────────────────────────────────────────────
# 4. MEMBROS DO PROJETO
# ─────────────────────────────────────────────────────────────────────────────

CARGOS_VALIDOS = ('GERENTE', 'DEV', 'QA')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def projeto_membros(request, projeto_id):
    """GET|POST /projetos/<id>/membros/"""
    projeto, cargo, err = _get_projeto_ou_403(request.user, projeto_id)
    if err:
        return err

    if request.method == 'GET':
        membros = ProjetoMembro.objects.filter(projeto=projeto).select_related('usuario')
        return Response([
            {'id': m.usuario.id, 'nome': m.usuario.nome, 'email': m.usuario.email, 'cargo': m.cargo}
            for m in membros
        ])

    if not request.user.admin and cargo != 'GERENTE':
        return Response({'detail': 'Apenas Gerentes ou Admins podem adicionar membros.'}, status=status.HTTP_403_FORBIDDEN)

    usuario_id  = request.data.get('usuario_id')
    novo_cargo  = request.data.get('cargo', '').upper()

    if not usuario_id or novo_cargo not in CARGOS_VALIDOS:
        return Response(
            {'detail': 'usuario_id e cargo (GERENTE|DEV|QA) são obrigatórios.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        novo_usuario = Usuario.objects.get(pk=usuario_id, ativo=True)
    except Usuario.DoesNotExist:
        return Response({'detail': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    membro, created = ProjetoMembro.objects.get_or_create(
        projeto=projeto, usuario=novo_usuario,
        defaults={'cargo': novo_cargo, 'adicionado_por': request.user},
    )
    if not created:
        return Response({'detail': 'Usuário já é membro deste projeto.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {'id': novo_usuario.id, 'nome': novo_usuario.nome, 'cargo': membro.cargo},
        status=status.HTTP_201_CREATED,
    )


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def projeto_membro_detail(request, projeto_id, usuario_id):
    """PATCH|DELETE /projetos/<id>/membros/<user_id>/"""
    projeto, cargo, err = _get_projeto_ou_403(request.user, projeto_id)
    if err:
        return err

    if not request.user.admin and cargo != 'GERENTE':
        return Response({'detail': 'Apenas Gerentes ou Admins podem alterar membros.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        membro = ProjetoMembro.objects.select_related('usuario').get(projeto=projeto, usuario_id=usuario_id)
    except ProjetoMembro.DoesNotExist:
        return Response({'detail': 'Membro não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        novo_cargo = request.data.get('cargo', '').upper()
        if novo_cargo not in CARGOS_VALIDOS:
            return Response({'detail': 'Cargo inválido. Use GERENTE, DEV ou QA.'}, status=status.HTTP_400_BAD_REQUEST)
        membro.cargo = novo_cargo
        membro.save(update_fields=['cargo'])
        return Response({'id': usuario_id, 'cargo': membro.cargo})

    # DELETE
    cards_afetados = Card.objects.filter(projeto=projeto, responsavel_id=usuario_id)
    if cards_afetados.exists():
        cards_afetados.update(responsavel=None)
        gerentes = ProjetoMembro.objects.filter(
            projeto=projeto, cargo='GERENTE'
        ).select_related('usuario').exclude(usuario_id=usuario_id)
        for g in gerentes:
            _enviar_email(
                g.usuario.email,
                f'Membro removido do projeto {projeto.nome}',
                f'O membro {membro.usuario.nome} foi removido e seus cards ficaram sem responsável.',
            )

    membro.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# 5. COLUNAS DO BOARD
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def projeto_colunas(request, projeto_id):
    """GET /projetos/<id>/colunas/"""
    projeto, cargo, err = _get_projeto_ou_403(request.user, projeto_id)
    if err:
        return err

    colunas = ColunasBoard.objects.filter(projeto=projeto).order_by('posicao')
    return Response([
        {'id': c.id, 'nome': c.nome, 'posicao': c.posicao}
        for c in colunas
    ])


# ─────────────────────────────────────────────────────────────────────────────
# 6. BACKLOG
# ─────────────────────────────────────────────────────────────────────────────

PRIORIDADE_ORDEM = {'URGENTE': 1, 'ALTA': 2, 'MEDIA': 3, 'BAIXA': 4}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def projeto_backlog(request, projeto_id):
    """GET /projetos/<id>/backlog/ — cards sem sprint, ordenados por prioridade."""
    projeto, cargo, err = _get_projeto_ou_403(request.user, projeto_id)
    if err:
        return err

    cards = (
        Card.objects.filter(projeto=projeto, sprint__isnull=True)
        .select_related('responsavel', 'coluna')
        .order_by('prioridade', 'criado_em')
    )
    return Response([_serializar_card(c) for c in cards])


# ─────────────────────────────────────────────────────────────────────────────
# 7. SPRINTS
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def projeto_sprints(request, projeto_id):
    """GET|POST /projetos/<id>/sprints/"""
    projeto, cargo, err = _get_projeto_ou_403(request.user, projeto_id)
    if err:
        return err

    if request.method == 'GET':
        # FIX (#5): total e concluídos agregados em uma única query.
        sprints = (
            Sprint.objects.filter(projeto=projeto)
            .annotate(
                total_cards=Count('cards'),
                concluidos=Count('cards', filter=Q(cards__coluna__e_final=True)),
            )
            .order_by('criado_em')
        )
        data = []
        for s in sprints:
            total = s.total_cards
            concl = s.concluidos
            data.append({
                'id':           s.id,
                'nome':         s.nome,
                'status':       s.status,
                'data_inicio':  s.data_inicio,
                'data_fim':     s.data_fim,
                'total_cards':  total,
                'concluidos':   concl,
                'progresso':    round(concl / total * 100, 1) if total else 0,
            })
        return Response(data)

    if not request.user.admin and cargo != 'GERENTE':
        return Response({'detail': 'Apenas Gerentes podem criar sprints.'}, status=status.HTTP_403_FORBIDDEN)

    nome = request.data.get('nome', '').strip()
    if not nome:
        return Response({'detail': 'Nome é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        sprint = Sprint.objects.create(
            projeto=projeto, nome=nome, status='PLANEJADA', criado_por=request.user
        )
    except IntegrityError:
        return Response(
            {'detail': 'Já existe uma sprint planejada ou ativa. Encerre-a antes de criar outra.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({'id': sprint.id, 'nome': sprint.nome, 'status': sprint.status}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sprint_iniciar(request, sprint_id):
    """POST /sprints/<id>/iniciar/"""
    try:
        sprint = Sprint.objects.select_related('projeto').get(pk=sprint_id)
    except Sprint.DoesNotExist:
        return Response({'detail': 'Sprint não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    projeto, cargo, err = _get_projeto_ou_403(request.user, sprint.projeto_id)
    if err:
        return err

    if not request.user.admin and cargo != 'GERENTE':
        return Response({'detail': 'Apenas Gerentes podem iniciar sprints.'}, status=status.HTTP_403_FORBIDDEN)

    if sprint.status != 'PLANEJADA':
        return Response({'detail': f'Sprint com status "{sprint.status}" não pode ser iniciada.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        sprint.status      = 'ATIVA'
        sprint.data_inicio = timezone.now().date()
        sprint.save(update_fields=['status', 'data_inicio'])
    except IntegrityError:
        return Response(
            {'detail': 'Já existe uma sprint ativa neste projeto.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({'id': sprint.id, 'status': sprint.status, 'data_inicio': sprint.data_inicio})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sprint_detail(request, sprint_id):
    """GET /sprints/<id>/ — árvore completa (cards + checklists + comentários + flags)."""
    try:
        sprint = Sprint.objects.select_related('projeto').get(pk=sprint_id)
    except Sprint.DoesNotExist:
        return Response({'detail': 'Sprint não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    projeto, cargo, err = _get_projeto_ou_403(request.user, sprint.projeto_id)
    if err:
        return err

    notifs_prefetch = Prefetch(
        'notificacoes',
        queryset=NotificacaoUsuario.objects.filter(usuario=request.user, lida=False),
        to_attr='notificacoes_nao_lidas',
    )

    # FIX (#3): prefetch de comentarios + autor + anexos; ordenação em Python.
    cards = (
        Card.objects.filter(sprint=sprint)
        .select_related('responsavel', 'coluna')
        .prefetch_related(
            'checklists__itens',
            'comentarios__autor',
            'comentarios__anexos',
            notifs_prefetch,
        )
    )

    cards_data = []
    for card in cards:
        tem_novidade = bool(card.notificacoes_nao_lidas)

        checklists_data = []
        for cl in card.checklists.all():
            checklists_data.append({
                'id':     cl.id,
                'titulo': cl.titulo,
                'itens': [
                    {
                        'id':            it.id,
                        'texto':         it.texto,
                        'concluido':     it.concluido,
                        'concluido_por': it.concluido_por_id,
                        'concluido_em':  it.concluido_em,
                    }
                    for it in cl.itens.all()
                ],
            })

        # FIX (#3): ordena a lista prefetchada em memória, sem nova query.
        comentarios_ordenados = sorted(card.comentarios.all(), key=lambda c: c.criado_em)
        comentarios_data = [_serializar_comentario(c) for c in comentarios_ordenados]

        card_dict = _serializar_card(card, tem_novidade=tem_novidade)
        card_dict['coluna_nome']   = card.coluna.nome if card.coluna else None
        card_dict['checklists']    = checklists_data
        card_dict['comentarios']   = comentarios_data
        cards_data.append(card_dict)

    return Response({
        'id':          sprint.id,
        'nome':        sprint.nome,
        'status':      sprint.status,
        'data_inicio': sprint.data_inicio,
        'data_fim':    sprint.data_fim,
        'projeto_id':  sprint.projeto_id,
        'cards':       cards_data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sprint_encerrar(request, sprint_id):
    """POST /sprints/<id>/encerrar/"""
    try:
        sprint = Sprint.objects.select_related('projeto').get(pk=sprint_id)
    except Sprint.DoesNotExist:
        return Response({'detail': 'Sprint não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    projeto, cargo, err = _get_projeto_ou_403(request.user, sprint.projeto_id)
    if err:
        return err

    if not request.user.admin and cargo != 'GERENTE':
        return Response({'detail': 'Apenas Gerentes podem encerrar sprints.'}, status=status.HTTP_403_FORBIDDEN)

    if sprint.status != 'ATIVA':
        return Response({'detail': 'Apenas sprints ATIVAS podem ser encerradas.'}, status=status.HTTP_400_BAD_REQUEST)

    proxima_sprint_id  = request.data.get('proxima_sprint_id')
    cards_para_backlog = request.data.get('cards_para_backlog', [])
    cards_para_sprint  = request.data.get('cards_para_sprint', [])

    if cards_para_backlog:
        Card.objects.filter(pk__in=cards_para_backlog, sprint=sprint).update(sprint=None)

    if proxima_sprint_id and cards_para_sprint:
        try:
            proxima = Sprint.objects.get(pk=proxima_sprint_id, projeto=projeto)
            Card.objects.filter(pk__in=cards_para_sprint, sprint=sprint).update(sprint=proxima)
        except Sprint.DoesNotExist:
            return Response({'detail': 'Próxima sprint não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    sprint.status       = 'ENCERRADA'
    sprint.data_fim     = timezone.now().date()
    sprint.encerrada_em = timezone.now()
    sprint.save(update_fields=['status', 'data_fim', 'encerrada_em'])

    return Response({'id': sprint.id, 'status': sprint.status, 'data_fim': sprint.data_fim})


# ─────────────────────────────────────────────────────────────────────────────
# 8. CARDS
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def projeto_cards(request, projeto_id):
    """POST /projetos/<id>/cards/ — cria TAREFA ou BUG."""
    projeto, cargo, err = _get_projeto_ou_403(request.user, projeto_id)
    if err:
        return err

    if not request.user.admin and cargo != 'GERENTE':
        return Response({'detail': 'Apenas Gerentes podem criar cards.'}, status=status.HTTP_403_FORBIDDEN)

    titulo = request.data.get('titulo', '').strip()
    tipo   = request.data.get('tipo', 'TAREFA').upper()

    if not titulo:
        return Response({'detail': 'Título é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
    if tipo not in ('TAREFA', 'BUG'):
        return Response({'detail': 'tipo deve ser TAREFA ou BUG.'}, status=status.HTTP_400_BAD_REQUEST)

    prioridade     = request.data.get('prioridade', 'MEDIA').upper()
    sprint_id      = request.data.get('sprint_id')
    responsavel_id = request.data.get('responsavel_id')
    due_date       = request.data.get('due_date')
    descricao      = request.data.get('descricao', '')

    coluna = (
        ColunasBoard.objects.filter(projeto=projeto, e_inicial=True).first()
        or ColunasBoard.objects.filter(projeto=projeto).order_by('posicao').first()
    )
    if coluna is None:
        return Response({'detail': 'Projeto não possui colunas configuradas.'}, status=status.HTTP_400_BAD_REQUEST)

    card_kwargs = dict(
        projeto=projeto,
        titulo=titulo,
        tipo=tipo,
        prioridade=prioridade,
        descricao=descricao,
        coluna=coluna,
        criado_por=request.user,
    )

    if sprint_id:
        try:
            card_kwargs['sprint'] = Sprint.objects.get(pk=sprint_id, projeto=projeto)
        except Sprint.DoesNotExist:
            return Response({'detail': 'Sprint não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    if responsavel_id:
        try:
            card_kwargs['responsavel'] = Usuario.objects.get(pk=responsavel_id)
        except Usuario.DoesNotExist:
            return Response({'detail': 'Responsável não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if due_date:
        card_kwargs['due_date'] = due_date

    if tipo == 'BUG':
        card_kwargs['passos_reproducao']  = request.data.get('passos_reproducao', '')
        card_kwargs['resultado_esperado'] = request.data.get('resultado_esperado', '')
        # FIX (#1): coluna card_origem_id existe no schema → uso da FK card_origem.
        card_origem_id = request.data.get('card_origem_id')
        if card_origem_id:
            try:
                card_kwargs['card_origem'] = Card.objects.get(pk=card_origem_id, projeto=projeto)
            except Card.DoesNotExist:
                pass

    card = Card.objects.create(**card_kwargs)
    _registrar_historico(card, request.user, 'CRIACAO', f'Card criado como {tipo}.')

    return Response(_serializar_card(card), status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cards_list(request):
    """GET /cards/ — lista geral; ?responsavel=me filtra próprios."""
    user = request.user

    projetos_ids = ProjetoMembro.objects.filter(usuario=user).values_list('projeto_id', flat=True)
    if user.admin:
        cards = Card.objects.all()
    else:
        cards = Card.objects.filter(projeto_id__in=projetos_ids)

    if request.query_params.get('responsavel') == 'me':
        cards = cards.filter(responsavel=user)

    cards = cards.select_related('responsavel', 'coluna').order_by('-criado_em')
    return Response([_serializar_card(c) for c in cards])


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def card_detail(request, card_id):
    """GET|PATCH|DELETE /cards/<id>/"""
    try:
        # FIX (#6): 'sprint' adicionado ao select_related (usado na regra de prazo).
        card = Card.objects.select_related(
            'projeto', 'responsavel', 'coluna', 'criado_por', 'sprint'
        ).get(pk=card_id)
    except Card.DoesNotExist:
        return Response({'detail': 'Card não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    projeto, cargo, err = _get_projeto_ou_403(request.user, card.projeto_id)
    if err:
        return err

    if request.method == 'GET':
        data = _serializar_card(card)
        data['passos_reproducao']  = getattr(card, 'passos_reproducao', None)
        data['resultado_esperado'] = getattr(card, 'resultado_esperado', None)
        data['card_origem_id']     = card.card_origem_id
        return Response(data)

    if request.method == 'DELETE':
        if not request.user.admin and cargo != 'GERENTE':
            return Response({'detail': 'Apenas Gerentes podem remover cards.'}, status=status.HTTP_403_FORBIDDEN)
        card.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH — 'status' NÃO entra (property derivada). Use 'coluna_id'.
    campos_simples = ['titulo', 'descricao', 'prioridade',
                      'passos_reproducao', 'resultado_esperado']
    for campo in campos_simples:
        if campo in request.data:
            setattr(card, campo, request.data[campo])

    if 'coluna_id' in request.data:
        try:
            nova_coluna = ColunasBoard.objects.get(pk=request.data['coluna_id'], projeto=projeto)
        except ColunasBoard.DoesNotExist:
            return Response({'detail': 'Coluna não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if card.coluna and card.coluna.nome == COLUNA_VALIDACAO_NOME:
            if cargo not in ('QA', 'GERENTE') and not request.user.admin:
                return Response(
                    {'detail': 'Apenas QA ou Gerentes podem mover cards para fora de Validação.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        coluna_anterior = card.coluna.nome if card.coluna else 'Nenhuma'
        card.coluna = nova_coluna
        _registrar_historico(card, request.user, 'MUDANCA_COLUNA',
                             f'{coluna_anterior} → {nova_coluna.nome}')

    if 'responsavel_id' in request.data:
        resp_id = request.data['responsavel_id']
        if resp_id is None:
            card.responsavel = None
        else:
            try:
                novo_resp = Usuario.objects.get(pk=resp_id)
                antigo = card.responsavel.nome if card.responsavel else 'Ninguém'
                card.responsavel = novo_resp
                _registrar_historico(card, request.user, 'MUDANCA_RESPONSAVEL',
                                     f'{antigo} → {novo_resp.nome}')
            except Usuario.DoesNotExist:
                return Response({'detail': 'Responsável não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if 'due_date' in request.data:
        if card.sprint and card.sprint.status == 'ATIVA':
            justificativa = request.data.get('justificativa_prazo', '').strip()
            if not justificativa:
                return Response(
                    {'detail': 'justificativa_prazo é obrigatória ao alterar due_date de card em sprint ativa.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # FIX (#2): JustificativaPrazo vem do import no topo do módulo.
            JustificativaPrazo.objects.create(
                card=card,
                usuario=request.user,
                justificativa=justificativa,
                due_date_anterior=card.due_date,
                due_date_nova=request.data['due_date'],
            )
        card.due_date = request.data['due_date']

    card.save()
    return Response(_serializar_card(card))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def card_historico(request, card_id):
    """GET /cards/<id>/historico/"""
    try:
        card = Card.objects.get(pk=card_id)
    except Card.DoesNotExist:
        return Response({'detail': 'Card não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    _, _, err = _get_projeto_ou_403(request.user, card.projeto_id)
    if err:
        return err

    historico = CardHistorico.objects.filter(card=card).select_related('usuario').order_by('alterado_em')
    return Response([
        {
            'id':           h.id,
            'tipo':         h.tipo,
            'detalhe':      h.detalhe,
            'usuario_id':   h.usuario_id,
            'usuario_nome': h.usuario.nome if h.usuario else None,
            'criado_em':    h.criado_em,
        }
        for h in historico
    ])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def card_marcar_visto(request, card_id):
    """POST /cards/<id>/marcar-visto/"""
    try:
        card = Card.objects.get(pk=card_id)
    except Card.DoesNotExist:
        return Response({'detail': 'Card não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    _, _, err = _get_projeto_ou_403(request.user, card.projeto_id)
    if err:
        return err

    NotificacaoUsuario.objects.filter(card=card, usuario=request.user, lida=False).update(lida=True)
    return Response({'detail': 'Marcado como visto.'})


# ─────────────────────────────────────────────────────────────────────────────
# 9. ESTIMATIVAS (Planning Poker)
# ─────────────────────────────────────────────────────────────────────────────

def _get_card_e_cargo(request, card_id):
    """Helper: retorna (card, cargo, err_response)."""
    try:
        card = Card.objects.select_related('projeto', 'sprint', 'coluna', 'responsavel').get(pk=card_id)
    except Card.DoesNotExist:
        return None, None, Response({'detail': 'Card não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    _, cargo, err = _get_projeto_ou_403(request.user, card.projeto_id)
    return card, cargo, err


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def card_estimativa_enviar(request, card_id):
    """POST /cards/<id>/estimativas/enviar/"""
    card, cargo, err = _get_card_e_cargo(request, card_id)
    if err:
        return err

    if not request.user.admin and cargo != 'GERENTE':
        return Response({'detail': 'Apenas Gerentes podem iniciar estimativas.'}, status=status.HTTP_403_FORBIDDEN)

    card.pronto_para_estimativa = True
    card.save(update_fields=['pronto_para_estimativa'])

    membros = ProjetoMembro.objects.filter(
        projeto_id=card.projeto_id, cargo__in=['DEV', 'QA']
    ).select_related('usuario')
    for m in membros:
        _enviar_email(
            m.usuario.email,
            f'Planning Poker — {card.titulo}',
            f'O card "{card.titulo}" está pronto para estimativa. Acesse o Lazuli para votar.',
        )

    return Response({'detail': 'Card marcado para estimativa. Membros notificados.'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def card_estimativas(request, card_id):
    """GET|POST /cards/<id>/estimativas/"""
    card, cargo, err = _get_card_e_cargo(request, card_id)
    if err:
        return err

    if request.method == 'POST':
        if cargo not in ('DEV', 'QA') and not request.user.admin:
            return Response({'detail': 'Apenas DEV e QA podem votar.'}, status=status.HTTP_403_FORBIDDEN)

        if not card.pronto_para_estimativa:
            return Response({'detail': 'Card não está aberto para estimativa.'}, status=status.HTTP_400_BAD_REQUEST)

        valor = request.data.get('valor')
        if valor is None:
            return Response({'detail': 'valor é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        estimativa, _ = Estimativa.objects.update_or_create(
            card=card, usuario=request.user,
            defaults={'valor': valor, 'revelada': False},
        )
        return Response({'id': estimativa.id, 'valor': estimativa.valor}, status=status.HTTP_201_CREATED)

    votos = Estimativa.objects.filter(card=card).select_related('usuario')
    revelados = votos.filter(revelada=True).exists()

    if revelados or request.user.admin or cargo == 'GERENTE':
        data = [
            {'usuario_id': v.usuario_id, 'usuario_nome': v.usuario.nome,
             'valor': v.valor, 'revelada': v.revelada}
            for v in votos
        ]
    else:
        data = [
            {'usuario_id': v.usuario_id, 'usuario_nome': v.usuario.nome,
             'valor': v.valor if v.usuario == request.user else None,
             'revelada': v.revelada}
            for v in votos
        ]

    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def card_estimativa_revelar(request, card_id):
    """POST /cards/<id>/estimativas/revelar/"""
    card, cargo, err = _get_card_e_cargo(request, card_id)
    if err:
        return err

    if not request.user.admin and cargo != 'GERENTE':
        return Response({'detail': 'Apenas Gerentes podem revelar estimativas.'}, status=status.HTTP_403_FORBIDDEN)

    estimativa_consolidada = request.data.get('estimativa_consolidada')
    if estimativa_consolidada is None:
        return Response({'detail': 'estimativa_consolidada é obrigatória.'}, status=status.HTTP_400_BAD_REQUEST)

    Estimativa.objects.filter(card=card).update(revelada=True)
    card.estimativa_consolidada = estimativa_consolidada
    card.pronto_para_estimativa = False
    card.save(update_fields=['estimativa_consolidada', 'pronto_para_estimativa'])

    return Response({'estimativa_consolidada': estimativa_consolidada, 'detail': 'Votos revelados.'})


# ─────────────────────────────────────────────────────────────────────────────
# 10. CHECKLISTS
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def card_checklists(request, card_id):
    """GET|POST /cards/<id>/checklists/"""
    card, cargo, err = _get_card_e_cargo(request, card_id)
    if err:
        return err

    if request.method == 'GET':
        cls = Checklist.objects.filter(card=card).prefetch_related('itens').order_by('posicao')
        return Response([
            {
                'id':      cl.id,
                'titulo':  cl.titulo,
                'posicao': cl.posicao,
                'itens': [
                    {
                        'id':            it.id,
                        'texto':         it.texto,
                        'concluido':     it.concluido,
                        'concluido_por': it.concluido_por_id,
                        'concluido_em':  it.concluido_em,
                    }
                    for it in cl.itens.all()
                ],
            }
            for cl in cls
        ])

    titulo = request.data.get('titulo', '').strip()
    if not titulo:
        return Response({'detail': 'Título é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    posicao = Checklist.objects.filter(card=card).count() + 1
    cl = Checklist.objects.create(card=card, titulo=titulo, posicao=posicao)
    return Response({'id': cl.id, 'titulo': cl.titulo, 'posicao': cl.posicao, 'itens': []},
                    status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def checklist_detail(request, checklist_id):
    """PATCH|DELETE /cards/checklists/<id>/"""
    try:
        cl = Checklist.objects.select_related('card__projeto').get(pk=checklist_id)
    except Checklist.DoesNotExist:
        return Response({'detail': 'Checklist não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    _, _, err = _get_projeto_ou_403(request.user, cl.card.projeto_id)
    if err:
        return err

    if request.method == 'PATCH':
        if 'titulo' in request.data:
            cl.titulo = request.data['titulo']
        if 'posicao' in request.data:
            cl.posicao = request.data['posicao']
        cl.save()
        return Response({'id': cl.id, 'titulo': cl.titulo, 'posicao': cl.posicao})

    cl.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checklist_itens(request, checklist_id):
    """POST /cards/checklists/<id>/itens/"""
    try:
        cl = Checklist.objects.select_related('card__projeto').get(pk=checklist_id)
    except Checklist.DoesNotExist:
        return Response({'detail': 'Checklist não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    _, _, err = _get_projeto_ou_403(request.user, cl.card.projeto_id)
    if err:
        return err

    texto = request.data.get('texto', '').strip()
    if not texto:
        return Response({'detail': 'Texto é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    item = ChecklistItem.objects.create(checklist=cl, texto=texto)
    return Response({'id': item.id, 'texto': item.texto, 'concluido': item.concluido},
                    status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def checklist_item_detail(request, item_id):
    """PATCH|DELETE /cards/checklists/itens/<id>/"""
    try:
        item = ChecklistItem.objects.select_related('checklist__card__projeto').get(pk=item_id)
    except ChecklistItem.DoesNotExist:
        return Response({'detail': 'Item não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    _, _, err = _get_projeto_ou_403(request.user, item.checklist.card.projeto_id)
    if err:
        return err

    if request.method == 'PATCH':
        if 'texto' in request.data:
            item.texto = request.data['texto']
        if 'concluido' in request.data:
            item.concluido = bool(request.data['concluido'])
            if item.concluido:
                item.concluido_por = request.user
                item.concluido_em  = timezone.now()
            else:
                item.concluido_por = None
                item.concluido_em  = None
        item.save()
        return Response({
            'id':            item.id,
            'texto':         item.texto,
            'concluido':     item.concluido,
            'concluido_por': item.concluido_por_id,
            'concluido_em':  item.concluido_em,
        })

    item.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# 11. VÍNCULOS ENTRE CARDS
# ─────────────────────────────────────────────────────────────────────────────

TIPOS_VINCULO = ('SUBTAREFA', 'RELACIONADO', 'BLOQUEIA', 'BLOQUEADO_POR')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def card_vinculos(request, card_id):
    """GET|POST /cards/<id>/vinculos/"""
    card, cargo, err = _get_card_e_cargo(request, card_id)
    if err:
        return err

    if request.method == 'GET':
        # FIX: Q em vez de | entre querysets (preserva select_related).
        vinculos = CardVinculo.objects.filter(
            Q(card_origem=card) | Q(card_destino=card)
        ).select_related('card_origem', 'card_destino')

        return Response([
            {
                'id':              v.id,
                'card_origem_id':  v.card_origem_id,
                'card_destino_id': v.card_destino_id,
                'tipo_vinculo':    v.tipo_vinculo,
            }
            for v in vinculos
        ])

    if not request.user.admin and cargo != 'GERENTE':
        return Response({'detail': 'Apenas Gerentes podem criar vínculos.'}, status=status.HTTP_403_FORBIDDEN)

    card_destino_id = request.data.get('card_destino_id')
    tipo_vinculo    = request.data.get('tipo_vinculo', '').upper()

    if not card_destino_id or tipo_vinculo not in TIPOS_VINCULO:
        return Response(
            {'detail': f'card_destino_id e tipo_vinculo ({"|".join(TIPOS_VINCULO)}) são obrigatórios.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        destino = Card.objects.get(pk=card_destino_id, projeto=card.projeto)
    except Card.DoesNotExist:
        return Response({'detail': 'Card destino não encontrado neste projeto.'}, status=status.HTTP_404_NOT_FOUND)

    if CardVinculo.objects.filter(card_origem=card, card_destino=destino, tipo_vinculo=tipo_vinculo).exists():
        return Response({'detail': 'Vínculo já existe.'}, status=status.HTTP_400_BAD_REQUEST)

    vinculo = CardVinculo.objects.create(
        card_origem=card, card_destino=destino,
        tipo_vinculo=tipo_vinculo, criado_por=request.user,
    )
    return Response(
        {'id': vinculo.id, 'card_origem_id': card.id, 'card_destino_id': destino.id, 'tipo_vinculo': tipo_vinculo},
        status=status.HTTP_201_CREATED,
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def vinculo_detail(request, vinculo_id):
    """DELETE /cards/vinculos/<id>/"""
    try:
        vinculo = CardVinculo.objects.select_related('card_origem__projeto').get(pk=vinculo_id)
    except CardVinculo.DoesNotExist:
        return Response({'detail': 'Vínculo não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    _, cargo, err = _get_projeto_ou_403(request.user, vinculo.card_origem.projeto_id)
    if err:
        return err

    if not request.user.admin and cargo != 'GERENTE':
        return Response({'detail': 'Apenas Gerentes podem remover vínculos.'}, status=status.HTTP_403_FORBIDDEN)

    vinculo.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# 12. COMENTÁRIOS
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def card_comentarios(request, card_id):
    """GET|POST /cards/<id>/comentarios/"""
    card, cargo, err = _get_card_e_cargo(request, card_id)
    if err:
        return err

    if request.method == 'GET':
        comentarios = Comentario.objects.filter(card=card).select_related(
            'autor'
        ).prefetch_related('anexos').order_by('criado_em')
        return Response([_serializar_comentario(c) for c in comentarios])

    texto = request.data.get('texto', '').strip()
    if not texto:
        return Response({'detail': 'Texto é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    comentario = Comentario.objects.create(card=card, autor=request.user, texto=texto)

    destinatarios = set()
    if card.responsavel and card.responsavel != request.user:
        destinatarios.add(card.responsavel.email)
    participantes = Comentario.objects.filter(card=card).exclude(
        autor=request.user
    ).values_list('autor__email', flat=True).distinct()
    destinatarios.update(participantes)

    for email in destinatarios:
        _enviar_email(
            email,
            f'Novo comentário em "{card.titulo}"',
            f'{request.user.nome} comentou:\n\n{texto}',
        )

    membros_ids = ProjetoMembro.objects.filter(
        projeto_id=card.projeto_id
    ).exclude(usuario=request.user).values_list('usuario_id', flat=True)
    for uid in membros_ids:
        NotificacaoUsuario.objects.get_or_create(
            card=card,
            usuario_id=uid,
            tipo='COMENTARIO',
            lida=False,
            defaults={
                'mensagem': f'Novo comentário em "{card.titulo}"',
            },
        )

    return Response(_serializar_comentario(comentario), status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def comentario_detail(request, comentario_id):
    """PATCH|DELETE /cards/comentarios/<id>/"""
    try:
        comentario = Comentario.objects.select_related('autor', 'card__projeto').get(pk=comentario_id)
    except Comentario.DoesNotExist:
        return Response({'detail': 'Comentário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    _, cargo, err = _get_projeto_ou_403(request.user, comentario.card.projeto_id)
    if err:
        return err

    eh_autor   = comentario.autor == request.user
    eh_gerente = cargo == 'GERENTE' or request.user.admin

    if request.method == 'PATCH':
        if not eh_autor:
            return Response({'detail': 'Você só pode editar seus próprios comentários.'}, status=status.HTTP_403_FORBIDDEN)
        texto = request.data.get('texto', '').strip()
        if not texto:
            return Response({'detail': 'Texto não pode ser vazio.'}, status=status.HTTP_400_BAD_REQUEST)
        comentario.texto      = texto
        comentario.editado_em = timezone.now()
        comentario.save(update_fields=['texto', 'editado_em'])
        return Response(_serializar_comentario(comentario))

    if not eh_autor and not eh_gerente:
        return Response({'detail': 'Sem permissão para remover este comentário.'}, status=status.HTTP_403_FORBIDDEN)
    comentario.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# 13. ANEXOS
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def card_anexos(request, card_id):
    """POST /cards/<id>/anexos/"""
    card, cargo, err = _get_card_e_cargo(request, card_id)
    if err:
        return err

    arquivo = request.FILES.get('arquivo')
    if not arquivo:
        return Response({'detail': 'Arquivo é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    url = request.data.get('url', f'/media/anexos/{arquivo.name}')

    anexo = Anexo.objects.create(
        card=card,
        enviado_por=request.user,
        url=url,
        nome_arquivo=arquivo.name,
        mime_type=arquivo.content_type,
    )
    return Response(
        {'id': anexo.id, 'nome': anexo.nome_arquivo, 'url': anexo.url},
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comentario_anexos(request, comentario_id):
    """POST /cards/comentarios/<id>/anexos/"""
    try:
        comentario = Comentario.objects.select_related('card__projeto').get(pk=comentario_id)
    except Comentario.DoesNotExist:
        return Response({'detail': 'Comentário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    _, _, err = _get_projeto_ou_403(request.user, comentario.card.projeto_id)
    if err:
        return err

    arquivo = request.FILES.get('arquivo')
    if not arquivo:
        return Response({'detail': 'Arquivo é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    url = request.data.get('url', f'/media/anexos/{arquivo.name}')

    anexo = Anexo.objects.create(
        comentario=comentario,
        card=comentario.card,
        enviado_por=request.user,
        url=url,
        nome_arquivo=arquivo.name,
        mime_type=arquivo.content_type,
    )
    return Response(
        {'id': anexo.id, 'nome': anexo.nome_arquivo, 'url': anexo.url},
        status=status.HTTP_201_CREATED,
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def anexo_detail(request, anexo_id):
    """DELETE /cards/anexos/<id>/"""
    try:
        anexo = Anexo.objects.select_related(
            'enviado_por', 'card__projeto', 'comentario__card__projeto'
        ).get(pk=anexo_id)
    except Anexo.DoesNotExist:
        return Response({'detail': 'Anexo não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    projeto_id = (
        anexo.card.projeto_id if anexo.card
        else anexo.comentario.card.projeto_id
    )
    _, cargo, err = _get_projeto_ou_403(request.user, projeto_id)
    if err:
        return err

    eh_dono    = anexo.enviado_por == request.user
    eh_gerente = cargo == 'GERENTE' or request.user.admin

    if not eh_dono and not eh_gerente:
        return Response({'detail': 'Sem permissão para remover este anexo.'}, status=status.HTTP_403_FORBIDDEN)

    # Anexo.url é TextField — NÃO chamar arquivo.delete().
    anexo.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# 14. VALIDAÇÃO QA
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def card_validacao(request, card_id):
    """GET|POST /cards/<id>/validacao/"""
    card, cargo, err = _get_card_e_cargo(request, card_id)
    if err:
        return err

    if request.method == 'GET':
        validacoes = ValidacaoQA.objects.filter(card=card).select_related('qa').order_by('criado_em')
        return Response([
            {
                'id':         v.id,
                'resultado':  v.resultado,
                'observacao': v.observacao,
                'qa_id':      v.qa_id,
                'qa_nome':    v.qa.nome,
                'criado_em':  v.criado_em,
            }
            for v in validacoes
        ])

    if cargo != 'QA' and not request.user.admin:
        return Response({'detail': 'Apenas membros com cargo QA podem registrar validações.'}, status=status.HTTP_403_FORBIDDEN)

    resultado  = request.data.get('resultado', '').upper()
    observacao = request.data.get('observacao', '')

    if resultado not in ('APROVADO', 'REPROVADO'):
        return Response({'detail': 'resultado deve ser APROVADO ou REPROVADO.'}, status=status.HTTP_400_BAD_REQUEST)

    validacao = ValidacaoQA.objects.create(
        card=card, qa=request.user, resultado=resultado, observacao=observacao
    )
    _registrar_historico(card, request.user, 'VALIDACAO_QA', f'Resultado: {resultado}')

    if card.responsavel:
        _enviar_email(
            card.responsavel.email,
            f'Validação QA — {card.titulo}',
            f'O QA {request.user.nome} registrou: {resultado}\n\n{observacao}',
        )

    return Response(
        {'id': validacao.id, 'resultado': resultado, 'observacao': observacao},
        status=status.HTTP_201_CREATED,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 15. IMPEDIMENTOS
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def card_impedimento(request, card_id):
    """POST|DELETE /cards/<id>/impedimento/"""
    card, cargo, err = _get_card_e_cargo(request, card_id)
    if err:
        return err

    if request.method == 'POST':
        comentario = request.data.get('comentario', '').strip()
        if not comentario:
            return Response({'detail': 'comentario é obrigatório para registrar o impedimento.'}, status=status.HTTP_400_BAD_REQUEST)

        card.impedido = True
        card.save(update_fields=['impedido'])
        _registrar_historico(card, request.user, 'IMPEDIMENTO', comentario)

        gerentes = ProjetoMembro.objects.filter(
            projeto_id=card.projeto_id, cargo='GERENTE'
        ).select_related('usuario')
        for g in gerentes:
            _enviar_email(
                g.usuario.email,
                f'Card impedido — {card.titulo}',
                f'{request.user.nome} registrou um impedimento:\n\n{comentario}',
            )

        return Response({'detail': 'Impedimento registrado.', 'impedido': True})

    card.impedido = False
    card.save(update_fields=['impedido'])
    _registrar_historico(card, request.user, 'IMPEDIMENTO_REMOVIDO', 'Impedimento removido.')
    return Response({'detail': 'Impedimento removido.', 'impedido': False})