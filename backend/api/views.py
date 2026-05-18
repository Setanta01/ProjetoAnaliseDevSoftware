# backend/api/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Usuario, Cargo, Projeto, ProjetoParticipante, Sprint, Task, Backlog


# ─── AUTH ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    email = request.data.get('email')
    password = request.data.get('password')
    nome = request.data.get('nome')
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
            ativo=True
        )
        user.set_password(password)
        user.save()
        return Response({'message': 'Usuário criado com sucesso!'}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def custom_token_obtain(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({'detail': 'Email e senha são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, email=email, password=password)

    if user is not None:
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })
    else:
        return Response({'detail': 'Credenciais inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    return Response({
        'id': user.id,
        'username': user.nome,
        'email': user.email,
        'cargo': user.cargo.nome,
    })


# ─── PROJETOS ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def projetos_list(request):
    user = request.user
    cargo_nome = user.cargo.nome

    if request.method == 'GET':
        if cargo_nome == 'ADMIN':
            # Admin vê todos os projetos
            projetos = Projeto.objects.all().order_by('-criado_em')
        else:
            # Outros veem apenas os que participam
            participacoes = ProjetoParticipante.objects.filter(
                usuario=user
            ).values_list('projeto_id', flat=True)
            projetos = Projeto.objects.filter(id__in=participacoes).order_by('-criado_em')

        data = [
            {
                'id': p.id,
                'nome': p.nome,
                'descricao': p.descricao,
                'criado_em': p.criado_em,
            }
            for p in projetos
        ]
        return Response(data)

    elif request.method == 'POST':
        if cargo_nome not in ('ADMIN', 'GERENTE'):
            return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        nome = request.data.get('nome')
        descricao = request.data.get('descricao', '')

        if not nome:
            return Response({'error': 'Nome é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            projeto = Projeto.objects.create(
                nome=nome,
                descricao=descricao,
                criado_por=user,
            )
            # Cria o backlog automaticamente
            Backlog.objects.create(projeto=projeto, nome='Backlog Principal')

            # Adiciona o criador como participante
            ProjetoParticipante.objects.create(
                projeto=projeto,
                usuario=user,
                convidado_por=user,
            )

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
        return Response({
            'id': projeto.id,
            'nome': projeto.nome,
            'descricao': projeto.descricao,
            'criado_em': projeto.criado_em,
        })

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
            concluidas = Task.objects.filter(sprint=s, status='CONCLUIDO').count()
            progresso = (concluidas / total_tasks * 100) if total_tasks > 0 else 0

            data.append({
                'id': s.id,
                'nome': s.nome,
                'status': s.status,
                'data_inicio': s.data_inicio,
                'data_fim': s.data_fim,
                'projeto_id': s.projeto_id,
                'total_tasks': total_tasks,
                'concluidas': concluidas,
                'progresso': round(progresso, 1),
            })

        return Response(data)

    elif request.method == 'POST':
        if cargo_nome not in ('ADMIN', 'GERENTE'):
            return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        projeto_id = request.data.get('projeto_id')
        nome = request.data.get('nome')

        if not projeto_id or not nome:
            return Response({'error': 'projeto_id e nome são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            projeto = Projeto.objects.get(pk=projeto_id)
            sprint = Sprint.objects.create(
                projeto=projeto,
                nome=nome,
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
        projeto_id = request.query_params.get('projeto_id')
        sprint_id = request.query_params.get('sprint_id')

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
                'id': t.id,
                'titulo': t.titulo,
                'descricao': t.descricao,
                'status': t.status,
                'prioridade': t.prioridade,
                'responsavel_id': t.responsavel_id,
                'responsavel_nome': t.responsavel.nome if t.responsavel else None,
                'sprint_id': t.sprint_id,
                'projeto_id': t.projeto_id,
                'criado_em': t.criado_em,
            }
            for t in tasks
        ]
        return Response(data)

    elif request.method == 'POST':
        projeto_id = request.data.get('projeto_id')
        titulo = request.data.get('titulo')

        if not projeto_id or not titulo:
            return Response({'error': 'projeto_id e titulo são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            projeto = Projeto.objects.get(pk=projeto_id)
            backlog = Backlog.objects.get(projeto=projeto)
            task = Task.objects.create(
                projeto=projeto,
                backlog=backlog,
                titulo=titulo,
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
            'id': task.id,
            'titulo': task.titulo,
            'descricao': task.descricao,
            'status': task.status,
            'prioridade': task.prioridade,
            'responsavel_nome': task.responsavel.nome if task.responsavel else None,
            'sprint_id': task.sprint_id,
            'projeto_id': task.projeto_id,
            'criado_em': task.criado_em,
        })

    if request.method == 'PATCH':
        if 'status' in request.data:
            task.status = request.data['status']
        if 'prioridade' in request.data:
            task.prioridade = request.data['prioridade']
        if 'titulo' in request.data:
            task.titulo = request.data['titulo']
        if 'descricao' in request.data:
            task.descricao = request.data['descricao']
        if 'responsavel_id' in request.data:
            task.responsavel_id = request.data['responsavel_id']
        if 'sprint_id' in request.data:
            task.sprint_id = request.data['sprint_id']
        task.save()
        return Response({'id': task.id, 'status': task.status})

    if request.method == 'DELETE':
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tasks_minhas(request):
    """Tasks onde o usuário autenticado é responsável."""
    user = request.user
    tasks = Task.objects.filter(responsavel=user).select_related('responsavel').order_by('-criado_em')

    data = [
        {
            'id': t.id,
            'titulo': t.titulo,
            'status': t.status,
            'prioridade': t.prioridade,
            'sprint_id': t.sprint_id,
            'projeto_id': t.projeto_id,
        }
        for t in tasks
    ]
    return Response(data)


# ─── ADMIN STATS ──────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    user = request.user
    if user.cargo.nome != 'ADMIN':
        return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

    total_usuarios = Usuario.objects.filter(ativo=True).count()
    total_projetos = Projeto.objects.count()
    sprints_ativas = Sprint.objects.filter(status='ATIVA').count()

    return Response({
        'total_usuarios': total_usuarios,
        'total_projetos': total_projetos,
        'sprints_ativas': sprints_ativas,
        'convites_pendentes': 0,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_usuarios(request):
    user = request.user
    if user.cargo.nome != 'ADMIN':
        return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

    usuarios = Usuario.objects.select_related('cargo').all().order_by('-criado_em')
    data = [
        {
            'id': u.id,
            'nome': u.nome,
            'email': u.email,
            'cargo': u.cargo.nome,
            'ativo': u.ativo,
            'criado_em': u.criado_em,
        }
        for u in usuarios
    ]
    return Response(data)