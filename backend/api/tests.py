from datetime import timedelta
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import MagicMock, patch

from django.test import override_settings
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate

from . import views
from . import views_mfa
from .email_service import EmailDeliveryError, enviar_email
from .mfa_utils import enviar_otp_email


class EmailServiceTests(TestCase):
    @override_settings(
        RESEND_API_KEY='re_test',
        DEFAULT_FROM_EMAIL='Lazuli <noreply@notifications.lazuliagil.com>',
    )
    @patch('api.email_service.resend.Emails.send')
    def test_sends_transactional_email_with_resend(self, resend_send):
        enviar_email('destino@example.com', 'Assunto', 'Linha 1\nLinha 2')

        resend_send.assert_called_once_with({
            'from': 'Lazuli <noreply@notifications.lazuliagil.com>',
            'to': ['destino@example.com'],
            'subject': 'Assunto',
            'text': 'Linha 1\nLinha 2',
            'html': '<p>Linha 1<br>Linha 2</p>',
        })

    @override_settings(RESEND_API_KEY='')
    def test_rejects_send_without_resend_api_key(self):
        with self.assertRaisesRegex(EmailDeliveryError, 'RESEND_API_KEY'):
            enviar_email('destino@example.com', 'Assunto', 'Corpo')

    @patch('api.mfa_utils.enviar_email')
    def test_mfa_email_uses_shared_resend_service(self, send):
        user = MagicMock(nome='Usuário', email='user@example.com')
        user.gerar_otp_email.return_value = '123456'

        enviar_otp_email(user)

        send.assert_called_once()
        self.assertEqual(send.call_args.args[0], 'user@example.com')
        self.assertIn('123456', send.call_args.args[2])


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

    @patch('api.views._enviar_email')
    @patch('api.views.secrets.token_urlsafe', return_value='convite-token')
    @patch('api.views.ConviteSistema')
    def test_admin_can_create_invitation_and_send_email(self, convite_model, token_urlsafe, enviar_email):
        convite_model.objects.filter.return_value.exists.return_value = False
        request = self.factory.post(
            '/api/admin/convites/',
            {'email': 'Novo@Example.com', 'admin': False},
            format='json',
        )
        force_authenticate(request, user=self.admin_user)

        response = views.admin_convites(request)

        self.assertEqual(response.status_code, 201)
        convite_model.objects.create.assert_called_once()
        enviar_email.assert_called_once()
        args = enviar_email.call_args.args
        self.assertEqual(args[0], 'novo@example.com')
        self.assertIn('/ativar-convite?token=convite-token', args[2])
        token_urlsafe.assert_called_once_with(40)

    @patch('api.views._enviar_email', side_effect=EmailDeliveryError('falha'))
    @patch('api.views.secrets.token_urlsafe', return_value='convite-token')
    @patch('api.views.ConviteSistema')
    def test_failed_invitation_delivery_removes_pending_invite(self, convite_model, token_urlsafe, enviar_email):
        convite_model.objects.filter.return_value.exists.return_value = False
        convite = convite_model.objects.create.return_value
        request = self.factory.post(
            '/api/admin/convites/',
            {'email': 'novo@example.com', 'admin': False},
            format='json',
        )
        force_authenticate(request, user=self.admin_user)

        response = views.admin_convites(request)

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.data, {'detail': 'Não foi possível enviar o convite por e-mail.'})
        convite.delete.assert_called_once_with()

    @patch('api.views.Usuario')
    @patch('api.views.ConviteSistema')
    def test_activate_invite_updates_existing_inactive_user(self, convite_model, usuario_model):
        convite = MagicMock(email='invitee@example.com', admin=False, criado_por=self.admin_user, usado=False, expira_em=None)
        convite_model.objects.get.return_value = convite
        existing_user = MagicMock(ativo=False)
        usuario_model.objects.get.return_value = existing_user

        response = views.auth_ativar_convite(self.factory.post(
            '/api/auth/ativar-convite/',
            {'token': 'convite-token', 'senha': 'SenhaForte!2026', 'confirmar_senha': 'SenhaForte!2026'},
            format='json',
        ))

        self.assertEqual(response.status_code, 200)
        existing_user.set_password.assert_called_once_with('SenhaForte!2026')
        existing_user.save.assert_called_once_with(update_fields=['admin', 'ativo', 'senha_hash', 'convidado_por'])
        convite.save.assert_called_once_with(update_fields=['usado'])

    @patch('api.views._enviar_email')
    @patch('api.views.RecuperacaoSenha')
    @patch('api.views.secrets.token_urlsafe', return_value='reset-token')
    @patch('api.views.Usuario')
    def test_password_recovery_creates_token_and_sends_email(self, usuario_model, token_urlsafe, recuperacao_model, enviar_email):
        user = MagicMock(email='user@example.com')
        usuario_model.objects.get.return_value = user

        response = views.auth_recuperar_senha(self.factory.post(
            '/api/auth/recuperar-senha/',
            {'email': 'user@example.com'},
            format='json',
        ))

        self.assertEqual(response.status_code, 200)
        recuperacao_model.objects.create.assert_called_once()
        enviar_email.assert_called_once()
        self.assertIn('/redefinir-senha?token=reset-token', enviar_email.call_args.args[2])
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
