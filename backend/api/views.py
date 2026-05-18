# backend/api/views.py
# Substitui o arquivo existente — adiciona suporte a MFA no login normal

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Usuario, Cargo, Projeto, ProjetoParticipante, Sprint, Task, Backlog
from .mfa_utils import gerar_mfa_token, enviar_otp_email


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _emitir_tokens(user: Usuario) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


def _resposta_mfa_pendente(user: Usuario) -> Response:
    mfa_token = gerar_mfa_token(user.id)
    return Response({
        'mfa_required': True,
        'mfa_tipo':  user.mfa_tipo,
        'mfa_token': mfa_token,
    }, status=status.HTTP_200_OK)


# ─── AUTH ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    email     = request.data.get('email')
    password  = request.data.get('password')
    nome      = request.data.get('nome')
    cargo_nome = request.data.get('cargo', 'DEV').upper()

    if not email or not password:
        return Response({'error': 'Email e senha são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

    if Usuario.objects.filter(email=email).exists():
        return Response({'error': 'Email já cadastrado.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        cargo_obj = Cargo.objects.get(nome=cargo_nome)
    except Cargo.DoesNotExist:
        return Response({'error': 'Cargo inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = Usuario(
            nome=nome or email.split('@')[0],
            email=email,
            cargo=cargo_obj,
            ativo=True,
        )
        user.set_password(password)
        user.save()
        return Response({'message': 'Usuário criado com sucesso!'}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def custom_token_obtain(request):
    """
    Login com email + senha.
    Se MFA ativo → retorna mfa_token (segundo fator obrigatório).
    Se não        → retorna access + refresh diretamente.
    """
    email    = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({'detail': 'Email e senha são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, email=email, password=password)

    if user is None:
        return Response({'detail': 'Credenciais inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)

    # MFA ativo → precisa do segundo fator
    if user.mfa_ativo:
        if user.mfa_tipo == 'EMAIL':
            try:
                enviar_otp_email(user)
            except Exception:
                return Response(
                    {'detail': 'Falha ao enviar código MFA por e-mail.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        return _resposta_mfa_pendente(user)

    return Response(_emitir_tokens(user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    return Response({
        'id':       user.id,
        'username': user.nome,
        'email':    user.email,
        'cargo':    user.cargo.nome,
        'mfa_ativo': user.mfa_ativo,
        'mfa_tipo':  user.mfa_tipo,
        'tem_google': bool(user.google_id),
    })


# ─── PROJETOS ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def projetos_list(request):
    user = request.user
    cargo_nome = user.cargo.nome

    if request.method == 'GET':
        if cargo_nome == 'ADMIN':
            projetos = Projeto.objects.all().order_by('-criado_em')
        else:
            participacoes = ProjetoParticipante.objects.filter(
                usuario=user
            ).values_list('projeto_id', flat=True)
            projetos = Projeto.objects.filter(id__in=participacoes).order_by('-criado_em')

        data = [
            {'id': p.id, 'nome': p.nome, 'descricao': p.descricao, 'criado_em': p.criado_em}
            for p in projetos
        ]
        return Response(data)

    elif request.method == 'POST':
        if cargo_nome not in ('ADMIN', 'GERENTE'):
            return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        nome     = request.data.get('nome')
        descricao = request.data.get('descricao', '')

        if not nome:
            return Response({'error': 'Nome é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            projeto = Projeto.objects.create(nome=nome, descricao=descricao, criado_por=user)
            Backlog.objects.create(projeto=projeto, nome='Backlog Principal')
            ProjetoParticipante.objects.create(projeto=projeto, usuario=user, convidado_por=user)
            return Response({'id': projeto.id, 'nome': projeto.nome}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def projeto_detail(request, pk):
    try:
        projeto = Projeto.objects.get(pk=pk)
    except Projeto.DoesNotExist:
        return Response({'error': 'Projeto não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'id': projeto.id, 'nome': projeto.nome, 'descricao': projeto.descricao, 'criado_em': projeto.criado_em})

    if request.method == 'PATCH':
        if 'nome' in request.data:
            projeto.nome = request.data['nome']
        if 'descricao' in request.data:
            projeto.descricao = request.data['descricao']
        projeto.save()
        return Response({'id': projeto.id, 'nome': projeto.nome})

    if request.method == 'DELETE':
        projeto.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── SPRINTS ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sprints_list(request):
    user = request.user
    cargo_nome = user.cargo.nome

    if request.method == 'GET':
        projeto_id = request.query_params.get('projeto_id')

        if cargo_nome == 'ADMIN':
            sprints = Sprint.objects.all()
        else:
            participacoes = ProjetoParticipante.objects.filter(
                usuario=user
            ).values_list('projeto_id', flat=True)
            sprints = Sprint.objects.filter(projeto_id__in=participacoes)

        if projeto_id:
            sprints = sprints.filter(projeto_id=projeto_id)

        sprints = sprints.order_by('-criado_em')

        data = []
        for s in sprints:
            total_tasks = Task.objects.filter(sprint=s).count()
            concluidas  = Task.objects.filter(sprint=s, status='CONCLUIDO').count()
            progresso   = (concluidas / total_tasks * 100) if total_tasks > 0 else 0
            data.append({
                'id': s.id, 'nome': s.nome, 'status': s.status,
                'data_inicio': s.data_inicio, 'data_fim': s.data_fim,
                'projeto_id': s.projeto_id,
                'total_tasks': total_tasks, 'concluidas': concluidas,
                'progresso': round(progresso, 1),
            })

        return Response(data)

    elif request.method == 'POST':
        if cargo_nome not in ('ADMIN', 'GERENTE'):
            return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        projeto_id = request.data.get('projeto_id')
        nome       = request.data.get('nome')

        if not projeto_id or not nome:
            return Response({'error': 'projeto_id e nome são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            projeto = Projeto.objects.get(pk=projeto_id)
            sprint  = Sprint.objects.create(
                projeto=projeto, nome=nome,
                data_inicio=request.data.get('data_inicio'),
                data_fim=request.data.get('data_fim'),
                status=request.data.get('status', 'PLANEJADA'),
                criado_por=user,
            )
            return Response({'id': sprint.id, 'nome': sprint.nome}, status=status.HTTP_201_CREATED)
        except Projeto.DoesNotExist:
            return Response({'error': 'Projeto não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── TASKS ────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tasks_list(request):
    user = request.user
    cargo_nome = user.cargo.nome

    if request.method == 'GET':
        status_filter = request.query_params.get('status')
        projeto_id    = request.query_params.get('projeto_id')
        sprint_id     = request.query_params.get('sprint_id')

        if cargo_nome == 'ADMIN':
            tasks = Task.objects.all()
        else:
            participacoes = ProjetoParticipante.objects.filter(
                usuario=user
            ).values_list('projeto_id', flat=True)
            tasks = Task.objects.filter(projeto_id__in=participacoes)

        if status_filter:
            tasks = tasks.filter(status=status_filter)
        if projeto_id:
            tasks = tasks.filter(projeto_id=projeto_id)
        if sprint_id:
            tasks = tasks.filter(sprint_id=sprint_id)

        tasks = tasks.select_related('responsavel', 'criado_por').order_by('-criado_em')

        data = [
            {
                'id': t.id, 'titulo': t.titulo, 'descricao': t.descricao,
                'status': t.status, 'prioridade': t.prioridade,
                'responsavel_id': t.responsavel_id,
                'responsavel_nome': t.responsavel.nome if t.responsavel else None,
                'sprint_id': t.sprint_id, 'projeto_id': t.projeto_id,
                'criado_em': t.criado_em,
            }
            for t in tasks
        ]
        return Response(data)

    elif request.method == 'POST':
        projeto_id = request.data.get('projeto_id')
        titulo     = request.data.get('titulo')

        if not projeto_id or not titulo:
            return Response({'error': 'projeto_id e titulo são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            projeto = Projeto.objects.get(pk=projeto_id)
            backlog = Backlog.objects.get(projeto=projeto)
            task    = Task.objects.create(
                projeto=projeto, backlog=backlog, titulo=titulo,
                descricao=request.data.get('descricao', ''),
                status=request.data.get('status', 'BACKLOG'),
                prioridade=request.data.get('prioridade', 'MEDIA'),
                criado_por=user,
                sprint_id=request.data.get('sprint_id'),
                responsavel_id=request.data.get('responsavel_id'),
            )
            return Response({'id': task.id, 'titulo': task.titulo}, status=status.HTTP_201_CREATED)
        except (Projeto.DoesNotExist, Backlog.DoesNotExist) as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def task_detail(request, pk):
    try:
        task = Task.objects.select_related('responsavel').get(pk=pk)
    except Task.DoesNotExist:
        return Response({'error': 'Task não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({
            'id': task.id, 'titulo': task.titulo, 'descricao': task.descricao,
            'status': task.status, 'prioridade': task.prioridade,
            'responsavel_nome': task.responsavel.nome if task.responsavel else None,
            'sprint_id': task.sprint_id, 'projeto_id': task.projeto_id,
            'criado_em': task.criado_em,
        })

    if request.method == 'PATCH':
        fields = ['status', 'prioridade', 'titulo', 'descricao', 'responsavel_id', 'sprint_id']
        for field in fields:
            if field in request.data:
                setattr(task, field, request.data[field])
        task.save()
        return Response({'id': task.id, 'status': task.status})

    if request.method == 'DELETE':
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tasks_minhas(request):
    user  = request.user
    tasks = Task.objects.filter(responsavel=user).select_related('responsavel').order_by('-criado_em')
    data  = [
        {'id': t.id, 'titulo': t.titulo, 'status': t.status,
         'prioridade': t.prioridade, 'sprint_id': t.sprint_id, 'projeto_id': t.projeto_id}
        for t in tasks
    ]
    return Response(data)


# ─── ADMIN ────────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    if request.user.cargo.nome != 'ADMIN':
        return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

    return Response({
        'total_usuarios':    Usuario.objects.filter(ativo=True).count(),
        'total_projetos':    Projeto.objects.count(),
        'sprints_ativas':    Sprint.objects.filter(status='ATIVA').count(),
        'convites_pendentes': 0,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_usuarios(request):
    if request.user.cargo.nome != 'ADMIN':
        return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

    usuarios = Usuario.objects.select_related('cargo').all().order_by('-criado_em')
    data = [
        {'id': u.id, 'nome': u.nome, 'email': u.email,
         'cargo': u.cargo.nome, 'ativo': u.ativo, 'criado_em': u.criado_em}
        for u in usuarios
    ]
    return Response(data)