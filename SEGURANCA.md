# Relatório de Segurança e Adequação — SETEC Solar

**Data da Auditoria / Correção:** 01/10/2026  
**Projeto:** SETEC Solar (React 19 + TypeScript + Vite + Vercel)  
**Branch:** `chore/seguranca-e-ui`

---

## 1. O Que Foi Corrigido no Frontend (Fase 1)

1. **Remoção de Credenciais Hardcoded (`src/pages/Usinas.tsx`):**
   - Removidos todos os segredos (tokens, `appId`, `appSecret`, senhas) que estavam sendo preenchidos automaticamente no formulário de inclusão de dataloggers/fornecedores para a Growatt e Solplanet.
   - Adicionados campos de entrada com `type="password"` e ícone de visibilidade (mostrar/ocultar) para todos os segredos e chaves de API (`appSecret`, `token`, `password`, `apiKey`).

2. **Garantia de Ignorar Segredos (`.gitignore`):**
   - Incluído o padrão `.env*` tanto no `.gitignore` da raiz quanto no `.gitignore` da pasta `frontend/`.

3. **Remoção de Mocks e Seletores de Simulação (`src/pages/Login.tsx`):**
   - Removido o seletor de "Perfil de acesso (simulação)" e a lista de perfis de teste com e-mails reais de clientes.
   - O formulário agora exige obrigatoriamente e-mail e senha, chamando o método de autenticação real (`auth.login(email, password)`).
   - Adicionado botão de visibilidade de senha e feedback claro de erro em caso de falha de autenticação.

4. **Remoção de Headers Inseguros e Centralização da API (`src/lib/api.ts`):**
   - Eliminada a dependência dos cabeçalhos customizados `x-user-role` e `x-user-email` em todas as requisições (`Usinas`, `Noc`, `Financeiro`, `Manutencao`, `Chamados`, `AppContext`).
   - Criado o cliente de requisições unificado (`apiFetch`), que gerencia automaticamente a URL base (`API_URL`), injeção de `credentials: 'include'` (cookies HTTP-only) e interceptação global de status `401 Unauthorized` (redireciona para `/login`) e `403 Forbidden` (redireciona para `/403`).

5. **Gerenciamento de Sessão e Autorização por Papel (`AuthContext` & `ProtectedRoute`):**
   - Criado o `AuthContext` / `useAuth` para consultar o perfil real do usuário logado através do backend (`/auth/me`).
   - Criado o componente `<ProtectedRoute roles={[...]} />` para proteção de rotas com base em papeis (`SUPER_ADMIN`, `GESTOR`, `OPERADOR`, `TECNICO`, `CLIENTE`).
   - Criada a tela dedicada de erro `403 Forbidden` ([`Unauthorized.tsx`](file:///c:/Users/mgcon/Downloads/SISTEMA%20SETEC%20ENERGIA-20260823T164026Z-1-001/SISTEMA%20SETEC%20ENERGIA/frontend/src/pages/Unauthorized.tsx)).

6. **Senhas Temporárias de Clientes e Links Seguros (`src/pages/Clientes.tsx`):**
   - Removida a senha fixa e os fallbacks. As credenciais e mensagens do WhatsApp agora orientam o cliente a realizar o primeiro acesso por link seguro e cadastrar sua própria senha.
   - Mensagens enviadas via WhatsApp usam `encodeURIComponent` e links abrem com `noopener,noreferrer`.

7. **Troca de Senha e Validação (`src/pages/Configuracoes.tsx`):**
   - Conectado o formulário de alteração de senha à API do backend com validação prévia de tamanho mínimo (10 caracteres) e confirmação idêntica de senha.

8. **Cabeçalhos de Segurança na Vercel (`vercel.json`):**
   - Adicionados os seguintes cabeçalhos de segurança para todas as rotas da aplicação:
     - `Content-Security-Policy`: Restrito a `'self'`, tiles de mapas (CARTO, ArcGIS, OpenStreetMap), ViaCEP, Nominatim, ipify e Google Fonts.
     - `X-Frame-Options`: `DENY`
     - `X-Content-Type-Options`: `nosniff`
     - `Referrer-Policy`: `strict-origin-when-cross-origin`
     - `Permissions-Policy`: `camera=(), microphone=(), geolocation=(self)`
     - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
   - Garantido que as regras de rewrite de SPA não capturem a rota `/api`.

9. **Isolamento de Recursos Mock:**
   - Condicionado a criação de contas de demonstração (`/gmail/mock-account`) estritamente ao ambiente de desenvolvimento (`import.meta.env.DEV`).

---

## 2. O Que Foi Corrigido no Backend (Fase 2 — Concluída em 03/10/2026)

1. **Módulo de Autenticação (`src/auth/auth.module.ts`, `auth.service.ts`, `auth.controller.ts`):**
   - Implementado endpoint `GET /api/auth/me`: retorna o perfil seguro e oficial do usuário autenticado (`id`, `name`, `email`, `role`).
   - Implementado endpoint `POST /api/auth/change-password`: valida a senha atual e atualiza a senha de forma criptografada tanto no Supabase Auth quanto no Prisma.
   - Implementado endpoint `POST /api/auth/login`: login server-side como fallback ou proxy.
   - Implementado endpoint `POST /api/auth/logout`.

2. **Blindagem Definitiva do `RoleGuard` (`src/auth/role.guard.ts`):**
   - **Removida a vulnerabilidade crítica de bypass:** Eliminado o fallback padrão para `SUPER_ADMIN` e a leitura ingênua do cabeçalho `x-user-role`.
   - **Validação Criptográfica de Tokens:** Toda requisição a rotas protegidas exige cabeçalho `Authorization: Bearer <token>`, validado criptograficamente pelo Supabase (`supabase.auth.getUser(token)`).
   - **Controle de Acesso Baseado em Papéis (RBAC):** Os perfis reais do usuário são consultados de forma segura no banco de dados (`User` e `Client`).
   - **Isolamento de Clientes:** Clientes (`CLIENTE`) são bloqueados de rotas administrativas e financeiras (`/financial`, `/datalogger-supplier`, `/gmail`).
   - **Proteção de Escrita:** Apenas `SUPER_ADMIN` e `GESTOR` (e técnicos autorizados) podem realizar alterações de dados (`POST`, `PUT`, `DELETE`, `PATCH`).

3. **Injeção Automática de Bearer Token no Frontend (`src/lib/api.ts`):**
   - O cliente de API (`apiFetch`) agora obtém automaticamente a sessão ativa do Supabase e anexa o token `Authorization: Bearer <access_token>` em todas as chamadas para o backend.

4. **Correção de Políticas de Segurança (CSP) na Vercel (`vercel.json`):**
   - Adicionadas as origens `https://*.supabase.co` e `wss://*.supabase.co` ao `connect-src` da política de Content Security Policy (CSP), garantindo que conexões de login, autenticação e WebSocket realtime funcionem em produção sem bloqueio pelo navegador.


---

## 3. Ações Manuais Obrigatórias para o Administrador

- [ ] **Rotacionar Chaves de API Comprometidas:**
  - Como os tokens e segredos da **Solplanet (AISWEI)** e **Growatt** estavam gravados em código-fonte, solicita-se revogar as chaves atuais nos portais dos fabricantes e gerar novas chaves no painel do desenvolvedor.
- [ ] **Limpar Histórico do Git (Remoção Definitiva dos Segredos):**
  - Como os segredos foram commitados em revisões passadas do repositório, utilize a ferramenta `git filter-repo` ou `BFG Repo-Cleaner` para expurgar as revisões antigas antes de tornar o repositório público ou compartilhar com terceiros:
    ```bash
    bfg --replace-text passwords.txt
    git reflog expire --expire=now --all && git gc --prune=now --aggressive
    ```
- [ ] **Executar Auditoria de Dependências:**
  - Executar na raiz do projeto e dentro da pasta `frontend/`:
    ```bash
    npm audit
    npm audit fix
    ```
