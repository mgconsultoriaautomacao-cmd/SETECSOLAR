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

## 2. O Que Depende do Backend (Requisitos do Servidor)

Para que a segurança e o controle de acesso funcionem plenamente de ponta a ponta, o backend NestJS (na pasta `/backend`) deve implementar os seguintes itens:

1. **Endpoint de Autenticação (`POST /api/auth/login`):**
   - Receber `email` e `password`.
   - Comparar a senha informada com o hash salvo no banco (usando `bcrypt` ou `argon2`).
   - Emitir um cookie de sessão seguro (`httpOnly`, `SameSite=Lax`, `Secure` em produção) ou um token JWT assinado.
2. **Endpoint de Perfil Atual (`GET /api/auth/me`):**
   - Validar o cookie/JWT da requisição e retornar os dados do usuário conectado: `{ id, name, email, role }`.
3. **Endpoint de Logout (`POST /api/auth/logout`):**
   - Invalidar a sessão e limpar o cookie `httpOnly`.
4. **Endpoint de Alteração de Senha (`POST /api/auth/change-password`):**
   - Validar a senha atual do usuário conectado e atualizar o hash da nova senha no banco.
5. **Middleware de Autorização por Papel (Guards no NestJS):**
   - Não confiar nos cabeçalhos `x-user-role` ou `x-user-email` enviados pelo cliente. Validar a autorização real diretamente na sessão/token no servidor para cada rota.
6. **Rate Limiting no Login:**
   - Implementar limitação de tentativas por IP no endpoint de login (ex: via `nestjs-throttler`) para prevenir ataques de força bruta.

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
