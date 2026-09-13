# 🚀 Partner — Gestão Ágil, Equipes & Dashboard Executivo

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-Next.js%2016-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/ORM-Prisma-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Deploy-Vercel%20%2B%20Render-blue?style=for-the-badge" alt="Deploy" />
</p>

---

## 📌 Sobre o Projeto

O **Partner** é uma plataforma corporativa completa desenvolvida para transformar a gestão de projetos, a colaboração entre equipes multidisciplinares e a visualização de métricas executivas em tempo real.

Projetada com foco em performance, modernidade e usabilidade de alto nível, a solução integra um frontend reativo em **Next.js 16 (React 19)** com uma API assíncrona robusta em **FastAPI (Python)** e banco de dados relacional **PostgreSQL hospedado no Supabase**.

---

## ✨ Funcionalidades Principais

### 📊 1. Dashboard Executivo & Home
- **KPIs em Tempo Real**: Métricas de Projetos Ativos, Tarefas na Sprint, Taxa de Entrega (94.2%) e Colaboradores Ativos.
- **Membro do Mês**: Reconhecimento com destaque e métricas de desempenho (entregas realizadas e índice de aprovação).
- **Meta de Faturamento Corporativo**: Acompanhamento visual da meta trimestral/anual com barra de progresso em gradiente, ticket médio, contratos vigentes e projeção financeira.
- **Histórico & Feed de Atividades**: Linha do tempo com as últimas ações dos colaboradores em tarefas e projetos.
- **Calendário Dinâmico de Entregas**: Visualização e filtro por mês com cronograma ordenado de prazos de projetos e tarefas críticas.

### 📋 2. Projetos & Quadro Kanban
- Visão geral de projetos com status, orçamento, prazos e clientes vinculados.
- Quadro **Kanban interativo** organizado nas etapas:
  - 📝 *A Fazer*
  - ⚡ *Em Andamento*
  - 🔍 *Em Revisão*
  - ✅ *Concluído*
- Badges de prioridade (*Alta*, *Média*, *Baixa*) e modais rápidos para criação e atualização de tarefas.

### 👥 3. Equipes & Comunicação Integrada
- Gestão centralizada de equipes com suporte a times públicos e privados.
- Atribuição de funções (Owner, Admin, Membro).
- **Chat do Time**: Canais de discussão contextualizados por equipe e reações.

### 🔐 4. Autenticação & Perfis
- Login e controle de acesso com JWT e Supabase Auth.
- Perfis de usuários com dados de contato, cargo e bio.
- Contas de demonstração já semeadas e prontas para uso.

---

## 🏗️ Arquitetura do Sistema

```text
               ┌────────────────────────┐
               │    Vercel (Frontend)   │
               │   Next.js 16 + React 19 │
               └───────────┬────────────┘
                           │
             REST API / CORS (HTTPS)
                           │
                           ▼
               ┌────────────────────────┐
               │    Render (Backend)    │
               │    Python / FastAPI    │
               └───────────┬────────────┘
                           │
                  Prisma Client (ORM)
                           │
                           ▼
               ┌────────────────────────┐
               │   Supabase PostgreSQL  │
               │   Database + Auth      │
               └────────────────────────┘
```

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Framework**: [Next.js 16.3.4](https://nextjs.org/) (App Router & Turbopack)
- **Biblioteca Base**: [React 19](https://react.dev/)
- **Estilização**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Ícones**: [Lucide React](https://lucide.dev/) & [React Icons](https://react-icons.github.io/react-icons/)
- **Notificações**: [React Toastify](https://fkhadra.github.io/react-toastify/)

### Backend
- **Linguagem**: [Python 3.11+](https://www.python.org/)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Servidor ASGI**: [Uvicorn](https://www.uvicorn.org/)
- **ORM**: [Prisma Client Python](https://prisma-client-py.readthedocs.io/)
- **Validação de Dados**: [Pydantic v2](https://docs.pydantic.dev/)

### Banco de Dados & Infraestrutura
- **Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL com PgBouncer Connection Pooling)
- **Hospedagem Frontend**: [Vercel](https://vercel.com/)
- **Hospedagem Backend**: [Render](https://render.com/)

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js** (v18+) e **npm**
- **Python** (v3.11+)
- Conta no **Supabase** (ou instância local do PostgreSQL)

---

### 1. Clonar o Repositório
```bash
git clone https://github.com/jsalless/partner.git
cd partner
```

---

### 2. Configurar o Backend

1. Acesse o diretório do backend e crie o ambiente virtual:
   ```bash
   cd backend
   python -m venv venv
   ```

2. Ative o ambiente virtual:
   - **Windows**:
     ```powershell
     .\venv\Scripts\activate
     ```
   - **Linux/macOS**:
     ```bash
     source venv/bin/activate
     ```

3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure as variáveis de ambiente no arquivo `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres.[SEU-PROJETO]:[SENHA]@aws-0-[REGIAO].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[SEU-PROJETO]:[SENHA]@aws-0-[REGIAO].pooler.supabase.com:5432/postgres"
   SUPABASE_URL="https://[SEU-PROJETO].supabase.co"
   SUPABASE_PUBLISHABLE_KEY="[SUA-ANON-KEY]"
   SUPABASE_SECRET_KEY="[SUA-SERVICE-ROLE-KEY]"
   BACKEND_PORT=8000
   ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
   ```

5. Gere o cliente Prisma e aplique o schema:
   ```bash
   prisma generate
   prisma db push
   ```

6. *(Opcional)* Popule o banco com dados de teste ricos para Power BI / Analytics:
   ```bash
   python -m app.seed
   ```

7. Inicie o servidor FastAPI:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   A documentação interativa Swagger estará disponível em: `http://localhost:8000/docs`

---

### 3. Configurar o Frontend

1. Abra outro terminal e acesse o diretório do frontend:
   ```bash
   cd frontend
   ```

2. Instale os pacotes:
   ```bash
   npm install
   ```

3. Crie o arquivo `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. Inicie o servidor Next.js:
   ```bash
   npm run dev
   ```
   Acesse a aplicação em: `http://localhost:3000`

---

## 🔑 Contas de Demonstração (Seed)

Para acessar e navegar pelas equipes, projetos e dados:

| E-mail | Senha Padrão | Função / Cargo |
| :--- | :--- | :--- |
| `ana.silva@partner.local` | `senha123@` | Tech Lead |
| `carlos.eduardo@partner.local` | `senha123@` | Desenvolvedor Fullstack |
| `beatriz.costa@partner.local` | `senha123@` | Product Owner |
| `camila.duarte@partner.local` | `senha123@` | UX/UI Designer (Membro do Mês) |
| `marcos.vinicius@partner.local` | `senha123@` | DevOps & Cloud |

---

## 🌐 Deploy em Produção

- **Frontend**: [Vercel](https://vercel.com/)
  - **Root Directory**: `frontend`
  - **Variável de Ambiente**: `NEXT_PUBLIC_API_URL=https://partner-backend-l5w4.onrender.com`
- **Backend**: [Render](https://render.com/)
  - **Root Directory**: `backend`
  - **Build Command**: `pip install -r requirements.txt && prisma generate`
  - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo de licença para mais informações.
