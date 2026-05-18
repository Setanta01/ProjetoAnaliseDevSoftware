# backend/api/models.py


from django.db import models


class Cargo(models.Model):
    id = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'cargos'
        managed = False

    def __str__(self):
        return self.nome


class Usuario(models.Model):
    id = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=120)
    email = models.CharField(max_length=150, unique=True)
    senha = models.CharField(max_length=255, blank=True)  # blank=True → usuários Google podem não ter senha

    cargo = models.ForeignKey(Cargo, on_delete=models.PROTECT, db_column='cargo_id')
    convidado_por = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, db_column='convidado_por')

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    # ── MFA ──────────────────────────────────────────────────────────────────
    mfa_ativo   = models.BooleanField(default=False)
    mfa_tipo    = models.CharField(
        max_length=10, null=True, blank=True,
        choices=[('TOTP', 'Authenticator App'), ('EMAIL', 'E-mail OTP')],
    )
    totp_secret = models.CharField(max_length=64,  null=True, blank=True)

    # OTP por e-mail (armazenado temporariamente, limpo após uso)
    otp_code      = models.CharField(max_length=8,  null=True, blank=True)
    otp_expira_em = models.DateTimeField(null=True, blank=True)

    # ── Google OAuth ──────────────────────────────────────────────────────────
    google_id = models.CharField(max_length=128, null=True, blank=True, unique=True)

    class Meta:
        db_table = 'usuarios'
        managed = False

    @property
    def is_authenticated(self):
        return True

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.senha = make_password(raw_password)

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.senha)

    # ── Helpers MFA ───────────────────────────────────────────────────────────

    def gerar_totp_secret(self):
        """Gera e salva um novo secret TOTP (não ativa o MFA ainda)."""
        import pyotp
        self.totp_secret = pyotp.random_base32()
        self.save(update_fields=['totp_secret'])
        return self.totp_secret

    def verificar_totp(self, code: str) -> bool:
        """Verifica código TOTP com janela de 1 período (±30 s)."""
        if not self.totp_secret:
            return False
        import pyotp
        totp = pyotp.TOTP(self.totp_secret)
        return totp.verify(code, valid_window=1)

    def gerar_otp_email(self) -> str:
        """Gera OTP numérico de 6 dígitos válido por 10 minutos."""
        import random
        from django.utils import timezone
        from datetime import timedelta
        code = f"{random.randint(0, 999999):06d}"
        self.otp_code = code
        self.otp_expira_em = timezone.now() + timedelta(minutes=10)
        self.save(update_fields=['otp_code', 'otp_expira_em'])
        return code

    def verificar_otp_email(self, code: str) -> bool:
        """Verifica OTP de e-mail e o invalida após uso correto."""
        from django.utils import timezone
        if not self.otp_code or not self.otp_expira_em:
            return False
        if timezone.now() > self.otp_expira_em:
            return False
        if self.otp_code != code:
            return False
        # Invalida após uso
        self.otp_code = None
        self.otp_expira_em = None
        self.save(update_fields=['otp_code', 'otp_expira_em'])
        return True

    def get_totp_uri(self, issuer: str = 'Lazuli') -> str:
        """Retorna o URI otpauth:// para gerar o QR code."""
        import pyotp
        totp = pyotp.TOTP(self.totp_secret)
        return totp.provisioning_uri(name=self.email, issuer_name=issuer)


# ─── Restante dos modelos (inalterados) ───────────────────────────────────────

class ConviteSistema(models.Model):
    id = models.AutoField(primary_key=True)
    email = models.CharField(max_length=150)
    cargo = models.ForeignKey(Cargo, on_delete=models.PROTECT, db_column='cargo_id')
    token = models.CharField(max_length=255, unique=True)
    criado_por = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column='criado_por', related_name='convites_gerados')
    usado = models.BooleanField(default=False)
    expira_em = models.DateTimeField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'convites_sistema'


class Projeto(models.Model):
    id = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=150)
    descricao = models.TextField(blank=True, null=True)
    criado_por = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column='criado_por')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projetos'


class ProjetoParticipante(models.Model):
    id = models.AutoField(primary_key=True)
    projeto = models.ForeignKey(Projeto, on_delete=models.CASCADE, db_column='projeto_id')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='usuario_id')
    convidado_por = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column='convidado_por', related_name='convidados_projeto')
    entrou_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projeto_participantes'
        constraints = [
            models.UniqueConstraint(fields=['projeto', 'usuario'], name='unique_projeto_usuario')
        ]


class Backlog(models.Model):
    id = models.AutoField(primary_key=True)
    projeto = models.OneToOneField(Projeto, on_delete=models.CASCADE, db_column='projeto_id', unique=True)
    nome = models.CharField(max_length=100, default='Backlog Principal')

    class Meta:
        db_table = 'backlogs'


class Sprint(models.Model):
    class Status(models.TextChoices):
        PLANEJADA = 'PLANEJADA', 'Planejada'
        ATIVA = 'ATIVA', 'Ativa'
        CONCLUIDA = 'CONCLUIDA', 'Concluída'

    id = models.AutoField(primary_key=True)
    projeto = models.ForeignKey(Projeto, on_delete=models.CASCADE, db_column='projeto_id')
    nome = models.CharField(max_length=100)
    data_inicio = models.DateField(null=True, blank=True)
    data_fim = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANEJADA)
    criado_por = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column='criado_por')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sprints'


class Task(models.Model):
    class Status(models.TextChoices):
        BACKLOG = 'BACKLOG', 'Backlog'
        TODO = 'TODO', 'To Do'
        EM_ANDAMENTO = 'EM_ANDAMENTO', 'Em Andamento'
        REVISAO = 'REVISAO', 'Revisão'
        CONCLUIDO = 'CONCLUIDO', 'Concluído'
        BLOQUEADO = 'BLOQUEADO', 'Bloqueado'

    class Prioridade(models.TextChoices):
        BAIXA = 'BAIXA', 'Baixa'
        MEDIA = 'MEDIA', 'Média'
        ALTA = 'ALTA', 'Alta'
        CRITICA = 'CRITICA', 'Crítica'

    id = models.AutoField(primary_key=True)
    projeto = models.ForeignKey(Projeto, on_delete=models.CASCADE, db_column='projeto_id')
    backlog = models.ForeignKey(Backlog, on_delete=models.CASCADE, db_column='backlog_id')
    sprint = models.ForeignKey(Sprint, on_delete=models.SET_NULL, null=True, blank=True, db_column='sprint_id')
    titulo = models.CharField(max_length=150)
    descricao = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.BACKLOG)
    prioridade = models.CharField(max_length=20, choices=Prioridade.choices, default=Prioridade.MEDIA)
    posicao = models.IntegerField(default=0)
    criado_por = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column='criado_por', related_name='tasks_criadas')
    responsavel = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='responsavel_id', related_name='tasks_responsavel')
    criado_em = models.DateTimeField(auto_now_add=True)
    story_points = models.IntegerField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    tags = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'tasks'


class Subtask(models.Model):
    class Status(models.TextChoices):
        TODO = 'TODO', 'To Do'
        EM_ANDAMENTO = 'EM_ANDAMENTO', 'Em Andamento'
        CONCLUIDO = 'CONCLUIDO', 'Concluído'

    id = models.AutoField(primary_key=True)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, db_column='task_id')
    titulo = models.CharField(max_length=150)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    posicao = models.IntegerField(default=0)
    responsavel = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='responsavel_id')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subtasks'


class Comentario(models.Model):
    id = models.AutoField(primary_key=True)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, db_column='task_id')
    usuario = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column='usuario_id')
    texto = models.TextField()
    editado_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comentarios'


class TaskHistorico(models.Model):
    class StatusChoices(models.TextChoices):
        BACKLOG = 'BACKLOG', 'Backlog'
        TODO = 'TODO', 'To Do'
        EM_ANDAMENTO = 'EM_ANDAMENTO', 'Em Andamento'
        REVISAO = 'REVISAO', 'Revisão'
        CONCLUIDO = 'CONCLUIDO', 'Concluído'
        BLOQUEADO = 'BLOQUEADO', 'Bloqueado'

    id = models.AutoField(primary_key=True)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, db_column='task_id')
    usuario = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column='usuario_id')
    status_anterior = models.CharField(max_length=20, choices=StatusChoices.choices, null=True, blank=True)
    status_novo = models.CharField(max_length=20, choices=StatusChoices.choices)
    alterado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_historico'


class Notificacao(models.Model):
    class Tipo(models.TextChoices):
        ATRIBUICAO = 'ATRIBUICAO', 'Atribuição'
        COMENTARIO = 'COMENTARIO', 'Comentário'
        SPRINT = 'SPRINT', 'Sprint'

    id = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='usuario_id')
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    mensagem = models.TextField()
    lida = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, db_column='task_id')
    sprint = models.ForeignKey(Sprint, on_delete=models.SET_NULL, null=True, blank=True, db_column='sprint_id')

    class Meta:
        db_table = 'notificacoes'