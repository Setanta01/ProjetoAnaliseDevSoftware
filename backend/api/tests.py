from unittest import TestCase
from unittest.mock import MagicMock, patch

from rest_framework.test import APIRequestFactory

from . import views


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
