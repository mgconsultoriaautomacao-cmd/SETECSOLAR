# SETEC Solar — Plataforma de Gestão e Monitoramento Fotovoltaico

Plataforma integrada de telemetria solar, gerenciamento de usinas fotovoltaicas, ordens de serviço (O.S.), chamados e faturamento da **SETEC Solar**.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
* Node.js (versão 18 ou superior)
* npm (versão 9 ou superior)

### 1. Clonar ou Acessar a Pasta do Projeto
```bash
cd "SISTEMA SETEC ENERGIA"
```

### 2. Instalação de Dependências
```bash
npm run install:all
```
*(ou execute `npm install` separadamente dentro de `backend` e `frontend`)*

### 3. Rodar Backend e Frontend Juntos
Na raiz de `SISTEMA SETEC ENERGIA`:
```bash
npm run dev
```
* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend:** [http://localhost:3001](http://localhost:3001)

#### Ou rodar individualmente:
* **Apenas Frontend:** `npm run dev --prefix frontend`
* **Apenas Backend:** `npm run dev --prefix backend`

---

## 🔐 Perfis de Acesso (Roles)

| Perfil | Descrição | Acesso às Telas |
| :--- | :--- | :--- |
| **SUPER_ADMIN** | Administrador geral do sistema | Acesso total a todos os módulos e configurações |
| **GESTOR** | Gestão operacional e financeira | Dashboard, Clientes, Usinas, NOC, Faturas, Financeiro, Manutenções, Chamados, Relatórios |
| **OPERADOR** | Monitoramento de telemetria | Dashboard, Usinas, NOC Solar, Chamados, Tickets |
| **TECNICO** | Equipe de campo e manutenção | Manutenções (O.S.), Usinas, Chamados, NOC |
| **CLIENTE** | Proprietário da usina solar | App do Cliente (`/app-cliente`), visualização exclusiva de suas usinas |

---

## ⚙️ Variáveis de Ambiente

### Frontend (`frontend/.env`)
```env
# URL da API Backend (em dev: http://localhost:3001/api, em prod: /api)
VITE_API_URL="http://localhost:3001/api"

# Credenciais do Supabase
VITE_SUPABASE_URL="https://dpmpxuahlpxucqeonrhk.supabase.co"
VITE_SUPABASE_ANON_KEY="sua_chave_anon_aqui"
```

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://postgres:[SENHA]@db.[REF].supabase.co:5432/postgres"
SUPABASE_URL="https://dpmpxuahlpxucqeonrhk.supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
PORT=3001
```

---

## 📁 Estrutura de Pastas

```
SISTEMA SETEC ENERGIA/
├── api/                    # Handler Serverless Vercel
├── backend/                # API NestJS + Prisma + Serviços de Inversores
│   ├── src/
│   │   ├── client/         # Módulo de clientes
│   │   ├── usina/          # Módulo de usinas fotovoltaicas
│   │   ├── solarman/       # Protocolo SolarmanV5/ModbusRTU
│   │   ├── financial/      # Módulo financeiro
│   │   ├── ticket/         # Chamados de suporte
│   │   └── work-order/     # Ordens de serviço e manutenção
│   └── prisma/             # Schema do banco de dados e migrações
└── frontend/               # SPA React + Vite + TypeScript + MUI
    ├── src/
    │   ├── components/     # Componentes compartilhados e Layout
    │   │   └── ui/         # Design System (PageHeader, StatCard, StatusBadge, DataTable)
    │   ├── context/        # AuthContext (Supabase) e AppContext
    │   ├── lib/            # Helpers centrais (apiFetch, supabase)
    │   ├── pages/          # Telas do sistema
    │   └── theme/          # Tokens de design e tema unificado MUI
    └── public/             # Favicons e manifestos da marca
```
