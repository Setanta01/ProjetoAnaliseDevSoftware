# Ajustes e Alinhamento da Codebase

Este documento detalha os passos necessários para refatorar e adequar a aplicação atual às definições documentadas no **Documento de Arquitetura de Software**, **endpoints-novo.md**, e **fluxos_de_uso.md**.

## 1. Backend (Refinamento e Mensageria)
O backend baseado em Django REST Framework (DRF) será mantido, junto com a recém-criada implementação nativa de autenticação (Google SSO e MFA).
- **Substituição do SMTP pelo Resend SDK: [✅ CONCLUÍDO]**
  - SDK do Resend configurado e `api/mfa_utils.py` refatorado para utilizá-lo garantindo operações mais rápidas e sem bloqueio longo.
- **Estruturação de Models e Views (Próximos Passos):**
  - Garantir que todos os models previstos em `schema.sql` estejam fielmente refletidos no `models.py`.
  - Desenvolver os serializers e as views estritamente baseadas no contrato do arquivo `endpoints-novo.md`.
- **Preparar para Notificações (Próximos Passos):**
  - Implementar _Django Signals_ (ou lógica no `.save()`) para disparar e-mails via Resend nas operações críticas: atribuição de card, menções em comentários, falhas na validação de QA, criação de impedimentos, e deleção de membros do projeto.
  - O endpoint de leitura da Sprint (`GET /api/sprints/<id>/`) usará a tabela `notificacoes` para injetar dinamicamente as flags `tem_novidade=true` nos cards, mantendo a comunicação em tempo real no Board do frontend.

## 2. Frontend (Scrap & Rebuild)
O frontend atual apresenta código macarrônico ("spaghetti") devido ao uso inadequado de estado global, ausência de rotas reais, e design em CSS inline em `components/ui.tsx`. Ele será reconstruído.
- **Limpeza e Estruturação:** Remover a lógica monolítica baseada no `App.tsx` (que gerencia páginas com a variável `view`).
- **Roteamento:** Instalar e configurar o `react-router-dom` para navegação adequada das rotas de autenticação, board, e dashboards.
- **Integração de Autenticação:** Conectar o novo frontend às rotas de desafio (MFA Challenge e Google Login) já construídas no DRF backend.
- **Gerenciamento de Estado/Cache API:** Instalar e configurar `react-query` (TanStack Query) para implementar o modelo arquitetural de **Short Polling** estipulado para a visualização dinâmica do Board. Isso inclui carregar a árvore toda em `GET /sprints/<id>/` e usar `invalidateQueries` para reatividade nas mutações.
- **Estilização e Componentes:** Configurar o Tailwind CSS e inicializar a biblioteca `shadcn/ui` para a construção visual das telas.
- **Refatoração de Telas:** Reescrever as Views e Dashboards utilizando os novos componentes e as rotas.

## 3. Infraestrutura (Deploy e Proxy Reverso)
- **Caddy Web Server:** Criar um `Caddyfile` na raiz do projeto para atuar como proxy reverso, roteando o tráfego HTTP/HTTPS estático (frontend) e repassando as requisições de API (`/api/*`) para o Gunicorn/Django.
- **Docker Compose:** Criar um arquivo `docker-compose.yml` que orquestre o Banco de Dados (PostgreSQL), o Backend (Django via Gunicorn) e o Caddy.
