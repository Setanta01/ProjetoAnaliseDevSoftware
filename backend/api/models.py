# backend/api/models.py


from django.db import models
from django.utils import timezone


# =============================================================================
# USUÁRIO
# =============================================================================

class Usuario(models.Model):
    """
    Tabela: usuarios

    - admin: flag booleana global (não é cargo de projeto)
    - Cargo de projeto vive em ProjetoMembro.cargo
    - Autenticação: senha_hash (local) ou google_id (OAuth)
    """

    id            = models.AutoField(primary_key=True)
    nome          = models.CharField(max_length=120)
    email         = models.CharField(max_length=150, unique=True)
    senha_hash    = models.CharField(max_length=255, blank=True, null=True,
                                     db_column='senha_hash')
    admin         = models.BooleanField(default=False)
    convidado_por = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='convidado_por',
        related_name='usuarios_convidados',
    )
    ativo     = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    # ── MFA ──────────────────────────────────────────────────────────────────
    mfa_ativo     = models.BooleanField(default=False)
    mfa_tipo      = models.CharField(
        max_length=10, null=True, blank=True,
        choices=[('TOTP', 'Authenticator App'), ('EMAIL', 'E-mail OTP')],
    )
    totp_secret   = models.CharField(max_length=64, null=True, blank=True)
    otp_code      = models.CharField(max_length=8,  null=True, blank=True)
    otp_expira_em = models.DateTimeField(null=True, blank=True)

    # ── Google OAuth ──────────────────────────────────────────────────────────
    google_id = models.CharField(max_length=128, null=True, blank=True, unique=True)

    class Meta:
        db_table = 'usuarios'
        managed  = False

    def __str__(self):
        return f'{self.nome} <{self.email}>'

    # ── Django auth protocol (sem AbstractBaseUser) ───────────────────────────

    @property
    def is_authenticated(self):
        # FIX (#7): um usuário inativo não deve ser considerado autenticado.
        return self.ativo

    @property
    def is_anonymous(self):
        return False

    @property
    def pk(self):
        return self.id

    # ── Senha ─────────────────────────────────────────────────────────────────

    def set_password(self, raw_password: str) -> None:
        from django.contrib.auth.hashers import make_password
        self.senha_hash = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.senha_hash or '')

    # ── MFA — TOTP ────────────────────────────────────────────────────────────

    def gerar_totp_secret(self) -> str:
        """Gera e persiste um novo secret TOTP (MFA ainda NÃO ativado)."""
        import pyotp
        self.totp_secret = pyotp.random_base32()
        self.save(update_fields=['totp_secret'])
        return self.totp_secret

    def verificar_totp(self, code: str) -> bool:
        """Verifica código TOTP com janela de ±1 período (±30 s)."""
        if not self.totp_secret:
            return False
        import pyotp
        return pyotp.TOTP(self.totp_secret).verify(code, valid_window=1)

    def get_totp_uri(self, issuer: str = 'Lazuli') -> str:
        """Retorna o URI otpauth:// para geração do QR code."""
        import pyotp
        return pyotp.TOTP(self.totp_secret).provisioning_uri(
            name=self.email, issuer_name=issuer
        )

    # ── MFA — OTP por e-mail ──────────────────────────────────────────────────

    def gerar_otp_email(self) -> str:
        """Gera OTP numérico de 6 dígitos válido por 10 minutos."""
        import random
        from datetime import timedelta
        code = f'{random.randint(0, 999_999):06d}'
        self.otp_code      = code
        self.otp_expira_em = timezone.now() + timedelta(minutes=10)
        self.save(update_fields=['otp_code', 'otp_expira_em'])
        return code

    def verificar_otp_email(self, code: str) -> bool:
        """Verifica OTP de e-mail e o invalida após uso correto."""
        if not self.otp_code or not self.otp_expira_em:
            return False
        if timezone.now() > self.otp_expira_em:
            return False
        if self.otp_code != code:
            return False
        self.otp_code      = None
        self.otp_expira_em = None
        self.save(update_fields=['otp_code', 'otp_expira_em'])
        return True


# =============================================================================
# CONVITES DO SISTEMA
# =============================================================================

class ConviteSistema(models.Model):
    """Tabela: convites_sistema"""

    id         = models.AutoField(primary_key=True)
    email      = models.CharField(max_length=150)
    admin      = models.BooleanField(default=False)
    token      = models.CharField(max_length=255, unique=True)
    criado_por = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='criado_por',
        related_name='convites_gerados',
    )
    usado     = models.BooleanField(default=False)
    expira_em = models.DateTimeField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'convites_sistema'
        managed  = False

    def __str__(self):
        return f'Convite para {self.email} (usado={self.usado})'


# =============================================================================
# SESSÕES / BLACKLIST JWT
# =============================================================================

class Sessao(models.Model):
    """Tabela: sessoes"""

    id        = models.AutoField(primary_key=True)
    usuario   = models.ForeignKey(
        Usuario, on_delete=models.CASCADE,
        db_column='usuario_id',
        related_name='sessoes',
    )
    token_jti = models.CharField(max_length=255, unique=True)
    revogado  = models.BooleanField(default=False)
    expira_em = models.DateTimeField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sessoes'
        managed  = False

    def __str__(self):
        return f'Sessao {self.token_jti[:12]}… (revogado={self.revogado})'


# =============================================================================
# RECUPERAÇÃO DE SENHA
# =============================================================================

class RecuperacaoSenha(models.Model):
    """Tabela: recuperacao_senha"""

    id        = models.AutoField(primary_key=True)
    usuario   = models.ForeignKey(
        Usuario, on_delete=models.CASCADE,
        db_column='usuario_id',
        related_name='recuperacoes_senha',
    )
    token     = models.CharField(max_length=255, unique=True)
    usado     = models.BooleanField(default=False)
    expira_em = models.DateTimeField()
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recuperacao_senha'
        managed  = False

    def __str__(self):
        return f'Recuperação para {self.usuario_id} (usado={self.usado})'


# =============================================================================
# PROJETOS
# =============================================================================

class Projeto(models.Model):
    """Tabela: projetos"""

    id         = models.AutoField(primary_key=True)
    nome       = models.CharField(max_length=150)
    descricao  = models.TextField(blank=True, null=True)
    criado_por = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='criado_por',
        related_name='projetos_criados',
    )
    arquivado = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projetos'
        managed  = False

    def __str__(self):
        return self.nome


# =============================================================================
# MEMBROS DO PROJETO
# =============================================================================

class ProjetoMembro(models.Model):
    """Tabela: projeto_membros"""

    CARGO_CHOICES = [
        ('GERENTE', 'Gerente'),
        ('DEV',     'Desenvolvedor'),
        ('QA',      'QA'),
    ]

    id             = models.AutoField(primary_key=True)
    projeto        = models.ForeignKey(
        Projeto, on_delete=models.CASCADE,
        db_column='projeto_id',
        related_name='projeto_membros',
    )
    usuario        = models.ForeignKey(
        Usuario, on_delete=models.CASCADE,
        db_column='usuario_id',
        related_name='membros_projetos',
    )
    cargo          = models.CharField(max_length=20, choices=CARGO_CHOICES)
    adicionado_por = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='adicionado_por',
        related_name='membros_adicionados',
    )
    entrou_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'projeto_membros'
        managed  = False
        constraints = [
            models.UniqueConstraint(
                fields=['projeto', 'usuario'],
                name='uq_projeto_membro',
            )
        ]

    def __str__(self):
        return f'{self.usuario} — {self.cargo} em {self.projeto}'


# =============================================================================
# COLUNAS DO BOARD
# =============================================================================

class ColunasBoard(models.Model):
    """Tabela: colunas_board"""

    id        = models.AutoField(primary_key=True)
    projeto   = models.ForeignKey(
        Projeto, on_delete=models.CASCADE,
        db_column='projeto_id',
        related_name='colunas',
    )
    nome      = models.CharField(max_length=100)
    posicao   = models.IntegerField(default=0)
    e_inicial = models.BooleanField(default=False)
    e_final   = models.BooleanField(default=False)

    class Meta:
        db_table = 'colunas_board'
        managed  = False
        constraints = [
            models.UniqueConstraint(
                fields=['projeto', 'posicao'],
                name='uq_coluna_posicao_projeto',
            )
        ]
        ordering = ['posicao']

    def __str__(self):
        return f'{self.nome} (pos={self.posicao}, projeto={self.projeto_id})'


# =============================================================================
# PERMISSÕES DE TRANSIÇÃO POR COLUNA
# =============================================================================

class PermissaoColuna(models.Model):
    """
    Tabela: permissoes_coluna

    Define quais cargos de projeto podem mover cards PARA esta coluna.
    Mantido mapeado para que a tabela do schema continue acessível via ORM,
    permitindo futura migração das regras de transição (hoje baseadas no nome
    da coluna em card_detail) para uma checagem configurável por projeto.
    """

    CARGO_CHOICES = [
        ('GERENTE', 'Gerente'),
        ('DEV',     'Desenvolvedor'),
        ('QA',      'QA'),
    ]

    id     = models.AutoField(primary_key=True)
    coluna = models.ForeignKey(
        ColunasBoard, on_delete=models.CASCADE,
        db_column='coluna_id',
        related_name='permissoes',
    )
    cargo  = models.CharField(max_length=20, choices=CARGO_CHOICES)

    class Meta:
        db_table = 'permissoes_coluna'
        managed  = False
        constraints = [
            models.UniqueConstraint(
                fields=['coluna', 'cargo'],
                name='uq_permissao_coluna_cargo',
            )
        ]

    def __str__(self):
        return f'Coluna {self.coluna_id} → {self.cargo}'


# =============================================================================
# SPRINTS
# =============================================================================

class Sprint(models.Model):
    """Tabela: sprints"""

    STATUS_CHOICES = [
        ('PLANEJADA', 'Planejada'),
        ('ATIVA',     'Ativa'),
        ('ENCERRADA', 'Encerrada'),
    ]

    id           = models.AutoField(primary_key=True)
    projeto      = models.ForeignKey(
        Projeto, on_delete=models.CASCADE,
        db_column='projeto_id',
        related_name='sprints',
    )
    nome         = models.CharField(max_length=100)
    data_inicio  = models.DateField(null=True, blank=True)
    data_fim     = models.DateField(null=True, blank=True)
    status       = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PLANEJADA'
    )
    criado_por   = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='criado_por',
        related_name='sprints_criadas',
    )
    criado_em    = models.DateTimeField(auto_now_add=True)
    encerrada_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'sprints'
        managed  = False

    def __str__(self):
        return f'{self.nome} [{self.status}]'


# =============================================================================
# CARDS (tarefas e bugs)
# =============================================================================

class Card(models.Model):
    """
    Tabela: cards

    - sprint=None → card está no backlog
    - passos_reproducao / resultado_esperado → exclusivos de BUG
    - card_origem (db_column='card_origem_id'): card que originou um BUG.
      A coluna existe no schema (adicionada via ALTER TABLE — ver schema.sql).
    - Sem campo 'status' no banco: status é inferido pela coluna (e_final=TRUE → concluído).
      NÃO use setattr(card, 'status', ...) — é uma property derivada, não persiste.
    """

    TIPO_CHOICES = [
        ('TAREFA', 'Tarefa'),
        ('BUG',    'Bug'),
    ]
    PRIORIDADE_CHOICES = [
        ('BAIXA',   'Baixa'),
        ('MEDIA',   'Média'),
        ('ALTA',    'Alta'),
        ('URGENTE', 'Urgente'),
    ]

    id          = models.AutoField(primary_key=True)
    codigo      = models.CharField(max_length=4, unique=True)
    projeto     = models.ForeignKey(
        Projeto, on_delete=models.CASCADE,
        db_column='projeto_id',
        related_name='cards',
    )
    sprint      = models.ForeignKey(
        Sprint, on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='sprint_id',
        related_name='cards',
    )
    coluna      = models.ForeignKey(
        ColunasBoard, on_delete=models.PROTECT,
        db_column='coluna_id',
        related_name='cards',
    )
    tipo        = models.CharField(max_length=10, choices=TIPO_CHOICES, default='TAREFA')
    titulo      = models.CharField(max_length=200)
    descricao   = models.TextField(blank=True, null=True)
    criterios_aceitacao = models.TextField(blank=True, null=True)
    prioridade  = models.CharField(
        max_length=10, choices=PRIORIDADE_CHOICES, default='MEDIA'
    )
    posicao     = models.IntegerField(default=0)
    criado_por  = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='criado_por',
        related_name='cards_criados',
    )
    responsavel = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='responsavel_id',
        related_name='cards_responsavel',
    )
    story_points           = models.IntegerField(null=True, blank=True)
    due_date               = models.DateField(null=True, blank=True)
    impedido               = models.BooleanField(default=False)

    # Planning Poker
    pronto_para_estimativa = models.BooleanField(default=False)
    estimativa_consolidada = models.IntegerField(null=True, blank=True)

    # Campos de BUG
    passos_reproducao  = models.TextField(blank=True, null=True)
    resultado_esperado = models.TextField(blank=True, null=True)
    # FIX (#1): coluna card_origem_id ADICIONADA ao schema.sql (ver ALTER TABLE).
    # FK auto-referente: card (tarefa) que originou este BUG.
    card_origem = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='card_origem_id',
        related_name='bugs_gerados',
    )

    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cards'
        managed  = False

    def __str__(self):
        return f'[{self.tipo}] {self.titulo}'

    @property
    def status(self):
        """
        Derivado da coluna: e_final=True → CONCLUIDO; caso contrário → ABERTO.
        Property somente-leitura — não persiste. Use card.coluna para alterar.
        """
        try:
            return 'CONCLUIDO' if self.coluna.e_final else 'ABERTO'
        except Exception:
            return 'ABERTO'


class SprintCardSnapshot(models.Model):
    """Snapshot independente dos cards no momento de encerramento da sprint."""

    id = models.AutoField(primary_key=True)
    sprint = models.ForeignKey(
        Sprint, on_delete=models.CASCADE,
        db_column='sprint_id',
        related_name='card_snapshots',
    )
    card_original_id = models.IntegerField()
    codigo = models.CharField(max_length=20, blank=True, null=True)
    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True, null=True)
    tipo = models.CharField(max_length=10)
    prioridade = models.CharField(max_length=10)
    status = models.CharField(max_length=20)
    coluna_nome = models.CharField(max_length=100, blank=True, null=True)
    responsavel_nome = models.CharField(max_length=150, blank=True, null=True)
    due_date = models.DateField(null=True, blank=True)
    estimativa_consolidada = models.IntegerField(null=True, blank=True)
    criado_em = models.DateTimeField()
    snapshot_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sprint_card_snapshots'
        managed = False
        constraints = [
            models.UniqueConstraint(
                fields=['sprint', 'card_original_id'],
                name='uq_sprint_card_snapshot',
            )
        ]

    def __str__(self):
        return f'Snapshot sprint={self.sprint_id} card={self.card_original_id}'


# =============================================================================
# VÍNCULOS ENTRE CARDS
# =============================================================================

class CardVinculo(models.Model):
    """Tabela: card_vinculos"""

    TIPO_CHOICES = [
        ('SUBTAREFA',     'Subtarefa'),
        ('RELACIONADO',   'Relacionado'),
        ('BLOQUEIA',      'Bloqueia'),
        ('BLOQUEADO_POR', 'Bloqueado por'),
    ]

    id           = models.AutoField(primary_key=True)
    card_origem  = models.ForeignKey(
        Card, on_delete=models.CASCADE,
        db_column='card_origem_id',
        related_name='vinculos_saida',
    )
    card_destino = models.ForeignKey(
        Card, on_delete=models.CASCADE,
        db_column='card_destino_id',
        related_name='vinculos_entrada',
    )
    tipo_vinculo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    criado_por   = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='criado_por',
        related_name='vinculos_criados',
    )
    criado_em    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'card_vinculos'
        managed  = False
        constraints = [
            models.UniqueConstraint(
                fields=['card_origem', 'card_destino', 'tipo_vinculo'],
                name='uq_vinculo',
            )
        ]

    def __str__(self):
        return f'{self.card_origem_id} →[{self.tipo_vinculo}]→ {self.card_destino_id}'


# =============================================================================
# HISTÓRICO DE MOVIMENTAÇÕES DO CARD
# =============================================================================

class CardHistorico(models.Model):
    """Tabela: card_historico — use _registrar_historico() em views.py."""

    id                   = models.AutoField(primary_key=True)
    card                 = models.ForeignKey(
        Card, on_delete=models.CASCADE,
        db_column='card_id',
        related_name='historico',
    )
    usuario              = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='usuario_id',
        related_name='historico_acoes',
    )
    coluna_anterior      = models.ForeignKey(
        ColunasBoard, on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='coluna_anterior_id',
        related_name='+',
    )
    coluna_nova          = models.ForeignKey(
        ColunasBoard, on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='coluna_nova_id',
        related_name='+',
    )
    responsavel_anterior = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='responsavel_anterior',
        related_name='+',
    )
    responsavel_novo     = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='responsavel_novo',
        related_name='+',
    )
    acao        = models.TextField()
    alterado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'card_historico'
        managed  = False
        ordering = ['alterado_em']

    def __str__(self):
        return f'Historico card={self.card_id} | {self.acao[:60]}'

    @property
    def criado_em(self):
        return self.alterado_em

    @property
    def tipo(self):
        return self.acao.split(':')[0].strip() if ':' in self.acao else self.acao

    @property
    def detalhe(self):
        parts = self.acao.split(':', 1)
        return parts[1].strip() if len(parts) > 1 else ''


# =============================================================================
# JUSTIFICATIVAS DE PRAZO
# =============================================================================

class JustificativaPrazo(models.Model):
    """Tabela: justificativas_prazo"""

    id                = models.AutoField(primary_key=True)
    card              = models.ForeignKey(
        Card, on_delete=models.CASCADE,
        db_column='card_id',
        related_name='justificativas_prazo',
    )
    usuario           = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='usuario_id',
        related_name='justificativas_prazo',
    )
    due_date_anterior = models.DateField(null=True, blank=True)
    due_date_nova     = models.DateField(null=True, blank=True)
    justificativa     = models.TextField()
    criado_em         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'justificativas_prazo'
        managed  = False

    def __str__(self):
        return f'Justificativa prazo card={self.card_id}'


# =============================================================================
# CHECKLISTS
# =============================================================================

class Checklist(models.Model):
    """Tabela: checklists"""

    id        = models.AutoField(primary_key=True)
    card      = models.ForeignKey(
        Card, on_delete=models.CASCADE,
        db_column='card_id',
        related_name='checklists',
    )
    titulo    = models.CharField(max_length=150)
    posicao   = models.IntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'checklists'
        managed  = False
        ordering = ['posicao']

    def __str__(self):
        return f'Checklist "{self.titulo}" (card={self.card_id})'


class ChecklistItem(models.Model):
    """Tabela: checklist_itens"""

    id            = models.AutoField(primary_key=True)
    checklist     = models.ForeignKey(
        Checklist, on_delete=models.CASCADE,
        db_column='checklist_id',
        related_name='itens',
    )
    texto         = models.CharField(max_length=300)
    concluido     = models.BooleanField(default=False)
    concluido_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='concluido_por',
        related_name='itens_concluidos',
    )
    posicao      = models.IntegerField(default=0)
    concluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'checklist_itens'
        managed  = False
        ordering = ['posicao']

    def __str__(self):
        return f'{"✓" if self.concluido else "○"} {self.texto[:60]}'


# =============================================================================
# ESTIMATIVAS (Planning Poker)
# =============================================================================

class Estimativa(models.Model):
    """Tabela: estimativas"""

    id            = models.AutoField(primary_key=True)
    card          = models.ForeignKey(
        Card, on_delete=models.CASCADE,
        db_column='card_id',
        related_name='estimativas',
    )
    usuario       = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='usuario_id',
        related_name='estimativas',
    )
    valor         = models.CharField(max_length=8)
    revelada      = models.BooleanField(default=False)
    criado_em     = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'estimativas'
        managed  = False
        constraints = [
            models.UniqueConstraint(
                fields=['card', 'usuario'],
                name='uq_estimativa_card_usuario',
            )
        ]

    def __str__(self):
        return f'Estimativa card={self.card_id} user={self.usuario_id} val={self.valor}'


# =============================================================================
# VALIDAÇÃO QA
# =============================================================================

class ValidacaoQA(models.Model):
    """Tabela: validacoes_qa"""

    RESULTADO_CHOICES = [
        ('APROVADO',  'Aprovado'),
        ('REPROVADO', 'Reprovado'),
    ]

    id        = models.AutoField(primary_key=True)
    card      = models.ForeignKey(
        Card, on_delete=models.CASCADE,
        db_column='card_id',
        related_name='validacoes',
    )
    qa        = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='qa_id',
        related_name='validacoes_qa',
    )
    resultado  = models.CharField(max_length=10, choices=RESULTADO_CHOICES)
    observacao = models.TextField(blank=True, null=True)
    criado_em  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'validacoes_qa'
        managed  = False

    def __str__(self):
        return f'Validação {self.resultado} (card={self.card_id})'


# =============================================================================
# COMENTÁRIOS
# =============================================================================

class Comentario(models.Model):
    """Tabela: comentarios — FK 'autor' usa db_column='usuario_id'."""

    id         = models.AutoField(primary_key=True)
    card       = models.ForeignKey(
        Card, on_delete=models.CASCADE,
        db_column='card_id',
        related_name='comentarios',
    )
    autor      = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='usuario_id',
        related_name='comentarios',
    )
    texto      = models.TextField()
    fixado     = models.BooleanField(default=False)
    editado_em = models.DateTimeField(null=True, blank=True)
    criado_em  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comentarios'
        managed  = False
        ordering = ['criado_em']

    def __str__(self):
        return f'Comentário de {self.autor_id} em card={self.card_id}'


# =============================================================================
# ANEXOS
# =============================================================================

class Anexo(models.Model):
    """
    Tabela: anexos — 'url' é TextField (não FileField).
    A deleção física é feita pela view quando a URL aponta para MEDIA_URL local.
    """

    id           = models.AutoField(primary_key=True)
    card         = models.ForeignKey(
        Card, on_delete=models.CASCADE,
        db_column='card_id',
        related_name='anexos',
    )
    comentario   = models.ForeignKey(
        Comentario, on_delete=models.CASCADE,
        null=True, blank=True,
        db_column='comentario_id',
        related_name='anexos',
    )
    enviado_por  = models.ForeignKey(
        Usuario, on_delete=models.DO_NOTHING,
        db_column='usuario_id',
        related_name='anexos_enviados',
    )
    nome_arquivo = models.CharField(max_length=255)
    url          = models.TextField(db_column='url')
    mime_type    = models.CharField(max_length=100, blank=True, null=True)
    criado_em    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'anexos'
        managed  = False

    def __str__(self):
        return self.nome_arquivo


# =============================================================================
# NOTIFICAÇÕES
# =============================================================================

class NotificacaoUsuario(models.Model):
    """Tabela: notificacoes — coluna 'lida' via db_column='lida'."""

    TIPO_CHOICES = [
        ('ATRIBUICAO', 'Atribuição'),
        ('COMENTARIO', 'Comentário'),
        ('SPRINT',     'Sprint'),
        ('PRAZO',      'Prazo'),
        ('IMPEDIMENTO','Impedimento'),
        ('VALIDACAO',  'Validação'),
        ('ESTIMATIVA', 'Estimativa'),
    ]

    id        = models.AutoField(primary_key=True)
    usuario   = models.ForeignKey(
        Usuario, on_delete=models.CASCADE,
        db_column='usuario_id',
        related_name='notificacoes',
    )
    tipo      = models.CharField(max_length=20, choices=TIPO_CHOICES, default='COMENTARIO')
    mensagem  = models.TextField(default='')
    lida      = models.BooleanField(default=False, db_column='lida')
    card      = models.ForeignKey(
        Card, on_delete=models.CASCADE,
        null=True, blank=True,
        db_column='card_id',
        related_name='notificacoes',
    )
    sprint    = models.ForeignKey(
        Sprint, on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column='sprint_id',
        related_name='notificacoes',
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificacoes'
        managed  = False

    def __str__(self):
        return f'Notif user={self.usuario_id} card={self.card_id} lida={self.lida}'


# =============================================================================
# FILA DE E-MAIL
# =============================================================================

class EmailFila(models.Model):
    """Tabela: email_fila — entrega assíncrona processada por management command."""

    STATUS_CHOICES = [
        ('PENDING', 'Pendente'),
        ('PROCESSING', 'Processando'),
        ('SENT', 'Enviado'),
        ('FAILED', 'Falhou'),
    ]

    id             = models.BigAutoField(primary_key=True)
    destinatario   = models.CharField(max_length=254)
    assunto        = models.CharField(max_length=255)
    template       = models.CharField(max_length=80)
    contexto       = models.JSONField(default=dict)
    status         = models.CharField(max_length=16, choices=STATUS_CHOICES, default='PENDING')
    tentativas     = models.PositiveSmallIntegerField(default=0)
    proxima_tentativa_em = models.DateTimeField(default=timezone.now)
    ultimo_erro    = models.TextField(blank=True, default='')
    criado_em      = models.DateTimeField(auto_now_add=True)
    atualizado_em  = models.DateTimeField(auto_now=True)
    enviado_em     = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'email_fila'
        managed = False
        ordering = ['criado_em']

    def __str__(self):
        return f'Email {self.id} para {self.destinatario} ({self.status})'
