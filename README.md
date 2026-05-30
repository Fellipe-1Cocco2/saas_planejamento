🚀 Planner SaaS - Enterprise

Um sistema inteligente e automatizado para gestão de tarefas, planeamento de equipas e delegação de funções. Criado para otimizar o tempo de líderes (Patrões) e organizar a rotina de execução dos funcionários através de algoritmos de fatiamento de carga horária.

✨ Principais Funcionalidades

🔐 Autenticação Segura (SSO): Login nativo com o Google (OAuth2) integrado a JWT para controlo de sessões.

👥 Controlo de Acessos (RBAC): - Patrão: Visão macro de todas as empresas, controlo da equipa, delegação de tarefas e visualização de progresso.

Empregado: Dashboard focado apenas nas tarefas do dia e backlog pessoal, sem acesso a dados confidenciais do sistema.

🏢 Multi-Empresas (Workspaces): Capacidade de separar tarefas, cronogramas e escopos por diferentes empresas ou projetos.

🪄 Auto-Organizador Inteligente (Fatiamento): O coração do sistema. O algoritmo pega numa "Macro-Tarefa" (Ex: 10 horas) e fatia-a automaticamente ao longo dos dias úteis da semana, respeitando a capacidade máxima diária definida por categoria (Cliente, Comercial, Estudo, Reunião).

📊 Visão Macro & Rastreabilidade: Tarefas fatiadas mantêm uma relação de "Mãe e Filhas" (blocoId). O líder consegue acompanhar o progresso total (%) num modal detalhado.

🚨 Alertas de SLA e Prazos: Sistema visual que sinaliza quebra de prazos master definidos na delegação ou prazos falhados pelo funcionário.

⚠️ Relatórios de Falha (N/F): Registo de reagendamento de tarefas com justificação (Imprevisto, Preguiça, Dispersão), marcando o histórico com "Feito em Atraso".

✉️ Notificações em Background: Sistema de envio de e-mails para novos convites de equipa e notificações de contas em análise.

🛠️ Tecnologias Utilizadas

Backend

Node.js com Express (API REST)

MongoDB + Mongoose (Base de dados NoSQL estruturada)

Google Auth Library (Verificação de tokens do Google)

JSON Web Token (JWT) (Autenticação interna)

Nodemailer (Disparo de e-mails)

Frontend

HTML5, CSS3, Vanilla JavaScript (Interface super leve e rápida, sem frameworks complexos)

Google Fonts (DM Mono e DM Sans)

Infraestrutura & Deploy

Vercel (Alojamento Serverless via @vercel/node)

MongoDB Atlas (Base de dados na nuvem)

⚙️ Estrutura do Projeto

/
├── frontend/             # Código do cliente (Páginas, CSS e Scripts JS)
│   ├── app.html          # Dashboard principal do SaaS
│   ├── login.html        # Página de entrada via Google
│   ├── css/style.css     # Estilos globais
│   └── js/app.js         # Inteligência principal do Front (Renderização e Algoritmos)
├── src/                  # Código do Servidor
│   ├── controllers/      # Regras de negócio (Auth, Tarefas, Equipa)
│   ├── models/           # Schemas do MongoDB (User, Task, Team, Company)
│   ├── routes/           # Endpoints da API REST
│   ├── utils/            # Ferramentas auxiliares (emailService.js)
│   └── server.js         # Ponto de entrada da aplicação
├── package.json          # Dependências do Node
├── vercel.json           # Configuração de Deploy para o Vercel Serverless
└── .env                  # Variáveis de ambiente (NÃO INCLUÍDO NO GIT)


🚀 Como Rodar o Projeto Localmente

1. Pré-requisitos

Certifique-se de que tem instalado na sua máquina:

Node.js (v16 ou superior)

Git

2. Clonar o Repositório

git clone [https://github.com/Fellipe-1Cocco2/saas_planejamento.git](https://github.com/SEU_USUARIO/saas_planejamento.git)
cd saas_planejamento


3. Instalar as Dependências

npm install


4. Configurar as Variáveis de Ambiente

Crie um ficheiro chamado .env na raiz do projeto e preencha com as suas credenciais:

# Porta do Servidor (Local)
PORT=5000

# Conexão MongoDB Atlas
MONGODB_URI=mongodb+srv://<usuario>:<senha>@cluster0.mongodb.net/nome_banco?retryWrites=true&w=majority

# Segredo para Assinatura JWT
JWT_SECRET=seu_segredo_super_forte_aqui

# Credenciais de E-mail (Nodemailer)
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=senha_de_aplicativo_do_google

# Credencial do Google Cloud API (SSO)
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com


5. Iniciar o Servidor

npm start
# O servidor estará a correr em http://localhost:5000


☁️ Deploy no Vercel

Este projeto está configurado para ser feito o deploy de forma nativa no Vercel através do ficheiro vercel.json.

Conecte o seu repositório do GitHub à sua conta do Vercel.

Na secção "Root Directory", deixe em branco (NÃO coloque src).

Adicione todas as Environment Variables listadas no passo 4 acima no painel do Vercel (exceto o PORT).

Clique em Deploy.

Nota sobre o Google SSO: Lembre-se de ir à consola da Google Cloud Platform (GCP) e adicionar o URL gerado pelo Vercel à lista de Origens JavaScript autorizadas e URIs de redirecionamento autorizados para que o login do Google funcione em produção.

🧠 Lógica de Fatiamento (Auto-Organizador)

O sistema conta com um algoritmo inteligente (distribuirTarefasInfinitas no app.js) que:

Lê o backlog de tarefas.

Identifica se a tarefa excede o limite diário da categoria (Ex: Estudo = 60 min, Cliente = 180 min).

Cria "Fatias" (Tarefas filhas) distribuídas para os próximos dias úteis.

Vincula as filhas à tarefa original guardando o ID original no campo blocoId do MongoDB.

Permite visualização do progresso através de uma janela modal única de Visão Macro.

🛡️ Licença

Projeto proprietário / Fechado. Uso exclusivo.