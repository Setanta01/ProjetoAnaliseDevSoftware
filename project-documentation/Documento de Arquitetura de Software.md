**Projeto:** Lazuli - Plataforma de Gestão Ágil

## 1. Visão Geral e Domínio do Sistema

O **Lazuli** é uma plataforma de gestão ágil voltada para equipes de desenvolvimento, desenhada para reduzir o atrito e simplificar fluxos de trabalho. O modelo de domínio central do sistema orbita em torno das seguintes entidades:
- **Projetos:** Contêineres lógicos de alto nível. Um projeto abriga uma equipe específica e concentra todo o escopo de trabalho.
- **Sprints:** Ciclos de tempo (timeboxes) associados a um projeto, divididos em *Sprints Ativas* (em execução) e *Sprints Planejadas* (backlog futuro).
- **Cards (Tarefas/Bugs):** A menor unidade de trabalho, contendo estimativas, prazos, responsáveis, status e checklists.
- **Workflow (Kanban):** Representação visual das etapas de desenvolvimento (ex: *To Do*, *Doing*, *Validação*, *Done*).

A plataforma adota o modelo de arquitetura Cliente-Servidor desacoplada, projetada para execução em nuvem através de containers **Docker**. Essa abordagem separa fisicamente a interface de usuário da lógica de processamento e armazenamento de dados. O ponto de entrada da aplicação é gerido pelo servidor web e proxy reverso (Caddy), responsável por rotear o tráfego HTTP/HTTPS estático para o frontend e repassar requisições dinâmicas para a API backend. O sistema como um todo é orquestrado via `docker-compose`, facilitando a implantação em ambientes de produção (como máquinas virtuais em nuvem).

## 2. Estruturação MVC Web Modernizada

A arquitetura do projeto é uma aplicação do padrão arquitetural Model-View-Controller (MVC) distribuído entre o cliente e o servidor.

#### Camada Model (Dados):

Responsável pela integridade da estrutura de dados, a camada é representada pelo PostgreSQL operando em conjunto com o Django ORM, que atua como uma interface segura, protegendo a aplicação de *SQL injections* através do uso de seus modelos declarativos, enquanto alterações futuras na base de dados são suportadas e controladas pelo sistema de _migrations_ do Django.

#### Camada Controller (Lógica de Negócio):

A camada de controle é implementada via **Django REST Framework (DRF)** integrado ao Django. O DRF atua recebendo as requisições HTTP, gerenciando o roteamento da API, e validando entradas e saídas através de *Serializers*. Ele provê uma estrutura robusta orientada a objetos (via *ViewSets* e *Class-Based Views*) para executar as regras de negócio e controle de permissões antes de interagir com a camada Model.

#### Camada View (Apresentação e Interação):

Desacoplada do servidor, a _View_ é uma Single Page Application (SPA) desenvolvida em React com TypeScript. Cache e estratégias de atualização de dados e recarregamento da página são delegadas ao React Query, e o design visual e acessibilidade são padronizados via Tailwind CSS e componentes visuais, como shadcn/ui.

## 3. Decisões Arquiteturais Secundárias e Componentes

#### Comunicação e Padrão de API:
A comunicação entre o cliente e o servidor ocorre exclusivamente através de uma **API RESTful** baseada em JSON, provida pelo Django REST Framework. A API utiliza métodos HTTP semânticos (GET, POST, PUT, PATCH, DELETE) e responde com códigos de status padronizados. O consumo de dados sensíveis e rotas protegidas exige a injeção do token JWT local no cabeçalho `Authorization: Bearer <token>`.

#### Gestão de Identidade e Acessos:
A **Autenticação** e a emissão de tokens JWT são gerenciadas nativamente pelo backend utilizando o **Django REST Framework (DRF)** com a biblioteca *Simple JWT*. A aplicação possui implementação própria para autenticação de dois fatores (MFA - via e-mail e TOTP) e Single Sign-On (SSO) com o Google OAuth. O fluxo de segurança utiliza um *Token de Desafio (MFA Token)* de curta duração antes da emissão do JWT final de sessão. A **Autorização** contextual define as permissões específicas do usuário dependendo do projeto que ele acessa, sendo estruturada através do sistema de Grupos e Permissões do Django em conjunto com tabelas associativas (como de “membro de um projeto”).

#### Comunicação Bidirecional Assíncrona:

Para atender aos requisitos de notificações e atualizações de interface (como comentários, ou modificações em um card no Kanban) sem a sobrecarga de manter conexões WebSockets abertas, a arquitetura definiu o uso de _Short Polling_. O frontend, gerenciado pelo React Query, realiza requisições HTTP de baixo custo e alta frequência para endpoints específicos no backend. Adicionalmente, interações com a tela usam _Optimistic Updates_ para atualizar a interface antes da confirmação do servidor, garantindo fluidez, e para implementar reversão no caso de erro da API.

#### Serviços de Mensagem:

Para que convites, recuperações de acesso, tokens de MFA OTP e notificações não bloqueiem requests da API, a aplicação persiste os envios em uma fila PostgreSQL. Um processo worker separado entrega mensagens HTML e texto através do backend SMTP do Django. No ambiente previsto para o projeto, o transporte usa Gmail com senha de aplicativo, podendo ser substituído por outro servidor SMTP sem alterar os fluxos da API.
