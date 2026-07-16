# Walkthrough — Cadastro de Fornecedores de Dataloggers, Módulo Financeiro & Integração Gmail

Fórmula de sucesso na implementação do Módulo Financeiro, Integração Gmail, Integração Growatt OpenAPI v4 e o Cadastro Dinâmico de Fornecedores de Dataloggers!

---

## 🛠️ Mudanças Realizadas

### 1. Cadastro Dinâmico de Fornecedores de Dataloggers (Novo)
- **Banco de Dados (Prisma):** 
  - Criado o modelo `DataloggerSupplier` para armazenar múltiplos fornecedores e suas credenciais específicas (tokens de API, chaves OAuth, e-mails e senhas).
  - Vinculado o modelo `Usina` à tabela `DataloggerSupplier` com chaves estrangeiras `dataloggerSupplierId` (limpeza inteligente `onDelete: SetNull` para não excluir a usina caso o fornecedor seja apagado).
- **Backend NestJS:**
  - Criado o módulo `DataloggerSupplierModule` com endpoints CRUD completos (`/api/datalogger-suppliers`) protegidos com `RoleGuard`.
  - Refatorado o `SolarmanService` para realizar o polling e testes de conexão de maneira isolada por conta. Se a usina tiver um fornecedor associado no banco, o sistema usa as chaves daquela conta de fornecedor específica (ex: tokens diferentes da Growatt ou credenciais adicionais da Solarman), suportando múltiplos clientes da SETEC sem misturar credenciais.
- **Frontend React (MUI):**
  - **Menu Suspenso (Dropdown):** No cadastro e na edição de usinas, o campo de texto livre de fabricante foi substituído por uma Lista Suspensa de fornecedores dinâmicos cadastrados no banco.
  - **Gerenciador de Fornecedores Inline:** Adicionado o botão "+ Fornecedor" no formulário de usinas. Ele abre um modal completo para a equipe da SETEC gerenciar (criar, listar, editar e deletar) as credenciais da Growatt, Solarman e Modbus local diretamente da tela de cadastro de usinas.
  - **Identificação Visual:** A tabela de usinas agora mostra entre colchetes a conta/fornecedor configurado (ex: `Growatt SETEC`).

### 2. Módulo Financeiro & Integração Gmail
- **FinancialRecord:** Armazena transações do tipo `PAGAR` e `RECEBER` com vencimentos, parcelas e vínculos a clientes.
- **GmailAccount:** Armazena conexões de e-mail autorizadas por OAuth.
- **Dashboard Financeiro:** Gráficos de área com gradientes fluidos e KPIs realistas de MRR e Fluxo de Caixa.
- **Leitura Automática de E-mails:** Inbox simulado de faturas com ação de "Lançar a partir do e-mail" pré-preenchendo dados de notas.

### 3. Integração Growatt OpenAPI v4 & Solplanet Cloud API (Novo)
- **Growatt:** Suporte nativo à busca automática de geração usando a API oficial da Growatt se a usina estiver associada a um fornecedor da Growatt.
- **Solplanet (Solar Planet / AISWEI):** 
  - Criado o `SolplanetService` que encapsula chamadas à API da Solplanet (`https://api.general.aisweicloud.com/getInverter`).
  - Implementado o algoritmo de assinatura segura `HMAC-SHA256` exigido pela Alibaba Cloud API Gateway da Solplanet (enviando `X-Ca-Key`, `X-Ca-Signature` e ordenação alfabética de parâmetros).
  - Se a usina estiver vinculada a um fornecedor do tipo `SOLPLANET_CLOUD`, o backend realiza automaticamente o polling e testes usando o `AppKey`, `AppSecret` e `Token` configurados da Solplanet.
  - O endpoint `/solarman/test` aceita `solplanet` ou `solplanetcloud` no campo IP para testar a comunicação direta com os servidores da Solplanet usando as chaves de acesso.

---

## 🧪 Validação e Testes de Build

- **Backend NestJS:** Compilação concluída com sucesso (`npm run build`).
- **Frontend React:** Build de produção gerado com sucesso sem erros de tipagem (`tsc -b && vite build`).

---

## ⚡ Ações do Usuário Localmente (Importante!)

Como a porta direta de PostgreSQL (5432) do Supabase é protegida no sandbox de desenvolvimento externo:
1. Abra o terminal local do seu computador na pasta `backend` e execute o comando abaixo para criar a nova tabela de fornecedores no seu banco de dados Supabase:
   ```bash
   npx prisma db push
   ```
2. Inicialize o projeto localmente digitando o comando na raiz:
   ```bash
   npm run dev
   ```
3. Acesse o painel de Usinas e clique no botão "+ Fornecedor" para cadastrar a **Solar Planet** (AISWEI) com o Token `N1YyRFB4aHF3T2tTTmJvMjZyNDF0QT09`, ou as contas da **Growatt** e **Solarman**!
4. A configuração do Google OAuth (opcional para e-mails reais) e API da Growatt já estão prontas no `backend/.env`.

