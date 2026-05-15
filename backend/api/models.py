from django.db import models


class Cargo(models.Model):
    id = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'cargos'
        managed = False  # Importante: O Django não vai tentar criar/migrar esta tabela

    def __str__(self):
        return self.nome


class Usuario(models.Model):
    id = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=120)
    email = models.CharField(max_length=150, unique=True)
    senha = models.CharField(max_length=255) # Mapeia a coluna 'senha' do seu SQL
    
    # Chaves Estrangeiras
    cargo = models.ForeignKey(Cargo, on_delete=models.PROTECT, db_column='cargo_id')
    convidado_por = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, db_column='convidado_por')
    
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    # --- NOVA ADIÇÃO ---
    @property
    def is_authenticated(self):
        """
        Otimização para o Django Rest Framework e SimpleJWT.
        Indica que qualquer instância carregada deste modelo é um usuário 
        autenticado válido (desde que exista no banco).
        """
        return True
    # ---------------------

    class Meta:
        db_table = 'usuarios'
        managed = False # Importante: O Django não vai tentar criar/migrar esta tabela

    # Métodos auxiliares para simular comportamento de usuário do Django
    def set_password(self, raw_password):
        """Criptografa a senha antes de salvar"""
        from django.contrib.auth.hashers import make_password
        self.senha = make_password(raw_password)

    def check_password(self, raw_password):
        """Verifica se a senha bate com o hash no banco"""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.senha)