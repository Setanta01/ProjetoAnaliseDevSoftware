from datetime import timedelta
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import MagicMock, patch

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate

from . import views
from . import views_mfa
from .email_service import enfileirar_email, enviar_email
from .email_templates import renderizar_email
from .management.commands.process_email_queue import process_next_email, send_queued_email
from .mfa_utils import enviar_otp_email


class EmailServiceTests(TestCase):
    @patch('api.email_service.EmailFila.objects.create')
    @patch('api.email_service.transaction.on_commit')
    def test_enqueues_email_after_commit(self, on_commit, create):
        on_commit.side_effect = lambda callback: callback()

        enfileirar_email(
            'destino@example.com',
            'Assunto',
            'notificacao',
            {'titulo': 'Assunto', 'mensagem': 'Corpo'},
        )

        create.assert_called_once_with(
            destinatario='destino@example.com',
            assunto='Assunto',
            template='notificacao',
            contexto={'titulo': 'Assunto', 'mensagem': 'Corpo'},
        )

    @patch('api.email_service.enfileirar_email')
    def test_compatibility_email_uses_notification_template(self, enqueue):
        enviar_email('destino@example.com', 'Assunto', 'Linha 1\nLinha 2')

        enqueue.assert_called_once_with(
            'destino@example.com',
            'Assunto',
            'notificacao',
            {'titulo': 'Assunto', 'mensagem': 'Linha 1\nLinha 2'},
        )

    @patch('api.mfa_utils.enfileirar_email')
    def test_mfa_email_uses_queue(self, enqueue):
        user = MagicMock(nome='Usuário', email='user@example.com')
        user.gerar_otp_email.return_value = '123456'

        enviar_otp_email(user)

        enqueue.assert_called_once_with(
            'user@example.com',
            'Seu código de verificação — Lazuli',
            'mfa_codigo',
            {'nome': 'Usuário', 'codigo': '123456', 'expiracao_minutos': 10},
        )


class EmailWorkerTests(TestCase):
    def test_template_escapes_user_content_and_keeps_text_fallback(self):
        text, html = renderizar_email(
            'notificacao',
            {'titulo': 'Atualização', 'mensagem': '<script>alert(1)</script>'},
        )

        self.assertIn('<script>alert(1)</script>', text)
        self.assertNotIn('<script>alert(1)</script>', html)
        self.assertIn('&lt;script&gt;alert(1)&lt;/script&gt;', html)

    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        DEFAULT_FROM_EMAIL='Lazuli <lazuli@example.com>',
    )
    def test_worker_builds_plain_text_and_html_email(self):
        job = SimpleNamespace(
            destinatario='destino@example.com',
            assunto='Convite Lazuli',
            template='convite',
            contexto={
                'link': 'https://example.com/ativar?token=abc',
                'expiracao_horas': 24,
                'acesso_admin': False,
            },
        )

        send_queued_email(job)

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Ativar minha conta', mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].alternatives[0][1], 'text/html')

    @patch('api.management.commands.process_email_queue.send_queued_email')
    @patch('api.management.commands.process_email_queue.claim_next_email')
    def test_worker_retries_without_raising_to_request_flow(self, claim, send):
        job = MagicMock(tentativas=1)
        claim.return_value = job
        send.side_effect = RuntimeError('SMTP indisponível')

        processed = process_next_email()

        self.assertTrue(processed)
        self.assertEqual(job.status, 'PENDING')
        self.assertIn('SMTP indisponível', job.ultimo_erro)
        job.save.assert_called_once()


class BootstrapAdminTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch('api.views.Usuario.objects.exists', return_value=False)
    def test_status_is_available_without_users(self, exists):
        response = views.auth_bootstrap_status(self.factory.get('/api/auth/bootstrap-status/'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'bootstrap_disponivel': True})
        exists.assert_called_once_with()

    @patch('api.views.Usuario.objects.exists', return_value=True)
    def test_status_is_unavailable_with_existing_users(self, exists):
        response = views.auth_bootstrap_status(self.factory.get('/api/auth/bootstrap-status/'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'bootstrap_disponivel': False})
        exists.assert_called_once_with()

    @patch('api.views.validate_password')
    @patch('api.views.connection.cursor')
    @patch('api.views.transaction.atomic')
    @patch('api.views.Usuario')
    def test_creates_first_admin(self, usuario, atomic, cursor, validate):
        usuario.objects.exists.return_value = False
        created = MagicMock(id=1, nome='Admin Inicial', email='admin@example.com', admin=True)
        usuario.return_value = created

        response = views.auth_bootstrap_admin(self.factory.post(
            '/api/auth/bootstrap-admin/',
            {
                'nome': 'Admin Inicial',
                'email': 'ADMIN@EXAMPLE.COM',
                'senha': 'SenhaForte!2026',
                'confirmar_senha': 'SenhaForte!2026',
            },
            format='json',
        ))

        self.assertEqual(response.status_code, 201)
        usuario.assert_called_once_with(
            nome='Admin Inicial', email='admin@example.com', admin=True, ativo=True,
        )
        created.set_password.assert_called_once_with('SenhaForte!2026')
        created.save.assert_called_once_with(force_insert=True)
        cursor.return_value.__enter__.return_value.execute.assert_called_once_with(
            'SELECT pg_advisory_xact_lock(%s)', [views.BOOTSTRAP_ADMIN_LOCK_ID],
        )
        validate.assert_called_once_with('SenhaForte!2026')
        atomic.assert_called_once_with()

    @patch('api.views.validate_password')
    @patch('api.views.connection.cursor')
    @patch('api.views.transaction.atomic')
    @patch('api.views.Usuario')
    def test_rejects_bootstrap_after_account_exists(self, usuario, atomic, cursor, validate):
        usuario.objects.exists.return_value = True

        response = views.auth_bootstrap_admin(self.factory.post(
            '/api/auth/bootstrap-admin/',
            {
                'nome': 'Outro Admin',
                'email': 'outro@example.com',
                'senha': 'SenhaForte!2026',
                'confirmar_senha': 'SenhaForte!2026',
            },
            format='json',
        ))

        self.assertEqual(response.status_code, 409)
        usuario.assert_not_called()
        cursor.return_value.__enter__.return_value.execute.assert_called_once()
        validate.assert_called_once_with('SenhaForte!2026')
        atomic.assert_called_once_with()

    def test_rejects_password_mismatch_before_database_access(self):
        response = views.auth_bootstrap_admin(self.factory.post(
            '/api/auth/bootstrap-admin/',
            {
                'nome': 'Admin Inicial',
                'email': 'admin@example.com',
                'senha': 'SenhaForte!2026',
                'confirmar_senha': 'SenhaDiferente!2026',
            },
            format='json',
        ))

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, {'detail': 'As senhas não coincidem.'})

    def test_rejects_invalid_email_before_database_access(self):
        response = views.auth_bootstrap_admin(self.factory.post(
            '/api/auth/bootstrap-admin/',
            {
                'nome': 'Admin Inicial',
                'email': 'email-invalido',
                'senha': 'SenhaForte!2026',
                'confirmar_senha': 'SenhaForte!2026',
            },
            format='json',
        ))

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, {'detail': 'Informe um endereço de e-mail válido.'})


class AuthFlowTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin_user = SimpleNamespace(
            id=1,
            admin=True,
            email='admin@lazuli.com',
            nome='Admin',
            is_authenticated=True,
        )

    @patch('api.views._emitir_tokens', return_value={'access': 'access-token', 'refresh': 'refresh-token'})
    @patch('api.views.authenticate')
    def test_login_returns_tokens_for_valid_credentials(self, authenticate, emitir_tokens):
        user = SimpleNamespace(ativo=True, mfa_ativo=False)
        authenticate.return_value = user

        response = views.auth_login(self.factory.post(
            '/api/auth/login/',
            {'email': 'USER@EXAMPLE.COM', 'senha': 'SenhaForte!2026'},
            format='json',
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'access': 'access-token', 'refresh': 'refresh-token'})
        authenticate.assert_called_once()
        self.assertEqual(authenticate.call_args.kwargs['email'], 'user@example.com')
        self.assertEqual(authenticate.call_args.kwargs['password'], 'SenhaForte!2026')
        emitir_tokens.assert_called_once_with(user)

    @patch('api.views.authenticate', return_value=None)
    def test_login_rejects_invalid_credentials(self, authenticate):
        response = views.auth_login(self.factory.post(
            '/api/auth/login/',
            {'email': 'user@example.com', 'senha': 'senha-incorreta'},
            format='json',
        ))

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data, {'detail': 'Credenciais inválidas.'})
        authenticate.assert_called_once()

    @patch('api.views.authenticate')
    def test_login_rejects_missing_required_fields(self, authenticate):
        response = views.auth_login(self.factory.post(
            '/api/auth/login/',
            {'email': 'user@example.com'},
            format='json',
        ))

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data, {'detail': 'E-mail e senha são obrigatórios.'})
        authenticate.assert_not_called()

    @patch('api.views.authenticate', return_value=None)
    def test_login_does_not_disclose_inactive_account(self, authenticate):
        response = views.auth_login(self.factory.post(
            '/api/auth/login/',
            {'email': 'inactive@example.com', 'senha': 'SenhaForte!2026'},
            format='json',
        ))

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data, {'detail': 'Credenciais inválidas.'})
        authenticate.assert_called_once()

    @patch('api.views._resposta_mfa_pendente', return_value=Response({'mfa_required': True, 'mfa_tipo': 'EMAIL', 'mfa_token': 'temp-token'}))
    @patch('api.views.enviar_otp_email')
    @patch('api.views.authenticate')
    def test_login_with_email_mfa_sends_code_and_returns_pending(self, authenticate, enviar_otp, resposta_mfa):
        authenticate.return_value = SimpleNamespace(ativo=True, mfa_ativo=True, mfa_tipo='EMAIL')

        response = views.auth_login(self.factory.post(
            '/api/auth/login/',
            {'email': 'user@example.com', 'senha': 'SenhaForte!2026'},
            format='json',
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'mfa_required': True, 'mfa_tipo': 'EMAIL', 'mfa_token': 'temp-token'})
        enviar_otp.assert_called_once()
        resposta_mfa.assert_called_once()

    @patch('api.views._agendar_email_convite')
    @patch('api.views.secrets.token_urlsafe', return_value='convite-token')
    @patch('api.views.ConviteSistema')
    def test_admin_can_create_invitation_and_queue_email(self, convite_model, token_urlsafe, schedule_email):
        convite_model.objects.filter.return_value.exists.return_value = False
        convite_model.objects.create.return_value.id = 8
        request = self.factory.post(
            '/api/admin/convites/',
            {'email': 'Novo@Example.com', 'admin': False},
            format='json',
        )
        force_authenticate(request, user=self.admin_user)

        response = views.admin_convites(request)

        self.assertEqual(response.status_code, 201)
        convite_model.objects.create.assert_called_once()
        schedule_email.assert_called_once_with(convite_model.objects.create.return_value)
        self.assertEqual(response.data['id'], 8)
        self.assertIn('agendado', response.data['detail'])
        token_urlsafe.assert_called_once_with(40)

    @patch('api.views._agendar_email_convite')
    @patch('api.views.ConviteSistema')
    def test_admin_can_resend_valid_pending_invitation(self, convite_model, schedule_email):
        convite = MagicMock(
            email='novo@example.com',
            usado=False,
            expira_em=timezone.now() + timedelta(hours=1),
        )
        convite_model.objects.get.return_value = convite
        request = self.factory.post('/api/admin/convites/7/reenviar/', {}, format='json')
        force_authenticate(request, user=self.admin_user)

        response = views.admin_convite_reenviar(request, 7)

        self.assertEqual(response.status_code, 200)
        schedule_email.assert_called_once_with(convite)
        convite.delete.assert_not_called()

    @patch('api.views.Usuario')
    @patch('api.views.ConviteSistema')
    def test_activate_invite_updates_existing_inactive_user(self, convite_model, usuario_model):
        convite = MagicMock(email='invitee@example.com', admin=False, criado_por=self.admin_user, usado=False, expira_em=None)
        convite_model.objects.get.return_value = convite
        existing_user = MagicMock(ativo=False)
        usuario_model.objects.get.return_value = existing_user

        response = views.auth_ativar_convite(self.factory.post(
            '/api/auth/ativar-convite/',
            {'token': 'convite-token', 'nome': 'Pessoa Convidada', 'senha': 'SenhaForte!2026', 'confirmar_senha': 'SenhaForte!2026'},
            format='json',
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(existing_user.nome, 'Pessoa Convidada')
        existing_user.set_password.assert_called_once_with('SenhaForte!2026')
        existing_user.save.assert_called_once_with(update_fields=['nome', 'admin', 'ativo', 'senha_hash', 'convidado_por'])
        convite.save.assert_called_once_with(update_fields=['usado'])

    @patch('api.views.enfileirar_email')
    @patch('api.views.RecuperacaoSenha')
    @patch('api.views.secrets.token_urlsafe', return_value='reset-token')
    @patch('api.views.Usuario')
    def test_password_recovery_creates_token_and_queues_email(self, usuario_model, token_urlsafe, recuperacao_model, enqueue):
        user = MagicMock(email='user@example.com', nome='Usuário')
        usuario_model.objects.get.return_value = user

        response = views.auth_recuperar_senha(self.factory.post(
            '/api/auth/recuperar-senha/',
            {'email': 'user@example.com'},
            format='json',
        ))

        self.assertEqual(response.status_code, 200)
        recuperacao_model.objects.create.assert_called_once()
        enqueue.assert_called_once()
        self.assertEqual(enqueue.call_args.args[2], 'recuperacao_senha')
        self.assertIn('/redefinir-senha?token=reset-token', enqueue.call_args.args[3]['link'])
        token_urlsafe.assert_called_once_with(40)

    @patch('api.views.Usuario.objects.get', side_effect=views.Usuario.DoesNotExist)
    def test_password_recovery_hides_unknown_email(self, usuario_get):

        response = views.auth_recuperar_senha(self.factory.post(
            '/api/auth/recuperar-senha/',
            {'email': 'missing@example.com'},
            format='json',
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'detail': 'Se o e-mail existir, você receberá as instruções em breve.'})
        usuario_get.assert_called_once_with(email='missing@example.com', ativo=True)

    @patch('api.views.RecuperacaoSenha')
    def test_password_reset_updates_password_and_marks_token_used(self, recuperacao_model):
        user = MagicMock()
        rec = MagicMock(usuario=user, usado=False, expira_em=timezone.now() + timedelta(hours=1))
        recuperacao_model.objects.select_related.return_value.get.return_value = rec

        response = views.auth_redefinir_senha(self.factory.post(
            '/api/auth/redefinir-senha/',
            {'token': 'reset-token', 'nova_senha': 'SenhaNova!2026'},
            format='json',
        ))

        self.assertEqual(response.status_code, 200)
        user.set_password.assert_called_once_with('SenhaNova!2026')
        user.save.assert_called_once_with(update_fields=['senha_hash'])
        rec.save.assert_called_once_with(update_fields=['usado'])


class MfaFlowTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch('api.views_mfa._emitir_tokens', return_value={'access': 'access-token', 'refresh': 'refresh-token'})
    @patch('api.views_mfa.verificar_mfa_token', return_value=10)
    @patch('api.views_mfa.Usuario')
    def test_mfa_challenge_returns_tokens_for_valid_email_code(self, usuario_model, verificar_token, emitir_tokens):
        user = MagicMock(ativo=True, mfa_tipo='EMAIL')
        user.verificar_otp_email.return_value = True
        usuario_model.objects.get.return_value = user

        response = views_mfa.mfa_challenge(self.factory.post(
            '/api/mfa/challenge/',
            {'mfa_token': 'temp-token', 'code': '123456'},
            format='json',
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'access': 'access-token', 'refresh': 'refresh-token'})
        verificar_token.assert_called_once_with('temp-token')
        emitir_tokens.assert_called_once_with(user)

    @patch('api.views_mfa.enviar_otp_email')
    @patch('api.views_mfa.verificar_mfa_token', return_value=10)
    @patch('api.views_mfa.Usuario')
    def test_mfa_resend_email_sends_new_code(self, usuario_model, verificar_token, enviar_otp):
        user = MagicMock()
        usuario_model.objects.get.return_value = user

        response = views_mfa.mfa_resend_email(self.factory.post(
            '/api/mfa/resend-email/',
            {'mfa_token': 'temp-token'},
            format='json',
        ))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'message': 'Novo código enviado.'})
        verificar_token.assert_called_once_with('temp-token')
        enviar_otp.assert_called_once_with(user)
