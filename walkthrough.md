/# Walkthrough — Módulo Financeiro & Integração Gmail (SETEC SOLAR)

Fórmula de sucesso na implementação do Módulo Financeiro (contas a pagar/receber) e da Integração de e-mails para leitura e lançamento de faturas via Gmail!

---

## 🛠️ Mudanças Realizadas

### 1. Banco de Dados & Modelos (Prisma/Supabase)
- **Modelos Criados:**
  - `FinancialRecord`: Tabela unificada para armazenar transações financeiras do tipo `PAGAR` e `RECEBER`. Contém campos específicos como data de vencimento, entrada de nota/emissão, status (`PENDENTE`, `PAGO`, `VENCIDO`, `ATRASADO`), informações de boletos, observações e vínculo opcional a um `Client` real do sistema.
  - `GmailAccount`: Tabela para armazenar as credenciais OAuth autorizadas (e-mail, nome do titular e refresh token) das usinas de energia.
- **Relacionamentos:**
  - Adicionado o relacionamento `financialRecords` no modelo `Client` para rastreabilidade de mensalidades.

### 2. Backend NestJS
- **Módulo Financial (`financial`):**
  - **Serviço:** Gerencia regras de criação, atualização, exclusão e busca. Inclui um método de agregação `getSummary()` que calcula em tempo real o MRR (Previsão de Receita do Mês), receitas recebidas, despesas a pagar e receitas atrasadas/vencidas do mês corrente.
  - **Controller:** Expõe as rotas REST completas protegidas por `RoleGuard` (permissões para SUPER_ADMIN e GESTOR para alterações de escrita).
- **Módulo Gmail (`gmail`):**
  - **Serviço:** Controla a comunicação com a API REST do Gmail usando tokens dinâmicos obtidos pelo refresh token. Implementa um **Modo de Demonstração (Simulado)** que gera e-mails fictícios realistas de faturas se as chaves Google Client ID/Secret não estiverem configuradas no `.env`.
  - **Controller:** Contém a rota de callback OAuth (redireciona de volta ao frontend com o status de sucesso/erro), listagem de contas de e-mail conectadas, cadastro de e-mails mockados (para simulação) e a busca de e-mails da caixa postal.

### 3. Frontend React (MUI / Recharts)
- **Tela de Finanças (`Financeiro.tsx`):**
  - **Dashboard:** KPIs integrados com as somas reais da API de MRR, Recebido, Contas a Pagar e Lucro Estimado. Gráfico de área (Recharts) com gradiente fluido mostrando a relação entre receita e despesa ao longo dos últimos 6 meses.
  - **Abas Contas a Receber & Contas a Pagar:** Tabelas responsivas com paginação, filtros rápidos por status e busca de texto. Dialogs ricos de lançamento financeiro integrados com a lista de clientes reais do sistema.
  - **Leitor de Faturas (Gmail):**
    - Permite selecionar a conta de usina solar conectada no menu suspenso.
    - Se a conta estiver em Modo Simulação ou Real, renderiza um painel estilo Gmail (inbox) mostrando as mensagens de faturas com remetentes destacados.
    - **Ação Rápida "Lançar a partir do e-mail":** Ao abrir um e-mail de fatura, o sistema extrai o remetente, assunto, snippet e tenta deduzir o valor (R$). Ao clicar em Lançar, abre o dialog de lançamentos já pré-preenchido, automatizando a digitação da despesa ou receita!

---

## 🧪 Validação e Testes de Build

- **Backend NestJS:** Compilado e gerado build com sucesso (`npm run build`).
- **Esquema do Prisma:** Gerado cliente com sucesso locally (`npx prisma generate`).

---

## ⚡ Próximos Passos (Ação do Usuário Localmente)

Como a porta direta de PostgreSQL (5432) do Supabase é bloqueada no sandbox da API:
1. Abra o terminal local na pasta `backend` e execute o comando abaixo para atualizar o banco de dados Supabase com as novas tabelas:
   ```bash
   npx prisma db push
   ```
2. Inicialize o projeto localmente digitando o comando na raiz:
   ```bash
   npm run dev
   ```
3. A configuração do Google OAuth (opcional para e-mails reais) pode ser feita adicionando as chaves no `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID="seu-client-id"
   GOOGLE_CLIENT_SECRET="seu-client-secret"
   GOOGLE_REDIRECT_URI="http://localhost:3001/api/gmail/callback"
   ```
   *Se não adicionar, o sistema continuará funcionando perfeitamente em modo de demonstração.*
