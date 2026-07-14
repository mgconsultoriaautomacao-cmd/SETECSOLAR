-- ============================================================
-- SETEC SOLAR — Setup completo do banco no Supabase (PostgreSQL)
-- Execute este script no SQL Editor do Supabase
-- Versão: 2.0 — inclui WorkOrderPart, colunas extras de O.S e Ticket
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. LIMPEZA (seguro para reexecutar em ambiente de testes)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "FinancialRecord" CASCADE;
DROP TABLE IF EXISTS "GmailAccount"    CASCADE;
DROP TABLE IF EXISTS "WorkOrderPart"  CASCADE;
DROP TABLE IF EXISTS "Ticket"         CASCADE;
DROP TABLE IF EXISTS "WorkOrder"      CASCADE;
DROP TABLE IF EXISTS "Invoice"        CASCADE;
DROP TABLE IF EXISTS "Usina"          CASCADE;
DROP TABLE IF EXISTS "Client"         CASCADE;
DROP TABLE IF EXISTS "User"           CASCADE;

DROP TYPE IF EXISTS "Role"            CASCADE;
DROP TYPE IF EXISTS "ClientStatus"    CASCADE;
DROP TYPE IF EXISTS "UsinaStatus"     CASCADE;
DROP TYPE IF EXISTS "OSStatus"        CASCADE;
DROP TYPE IF EXISTS "OSPriority"      CASCADE;
DROP TYPE IF EXISTS "ServiceType"     CASCADE;
DROP TYPE IF EXISTS "TicketCategory"  CASCADE;
DROP TYPE IF EXISTS "TicketStatus"    CASCADE;

-- ────────────────────────────────────────────────────────────
-- 1. ENUMs
-- ────────────────────────────────────────────────────────────

CREATE TYPE "Role" AS ENUM (
  'SUPER_ADMIN',
  'GESTOR',
  'OPERADOR',
  'TECNICO',
  'CLIENTE'
);

CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "UsinaStatus" AS ENUM ('ONLINE', 'ALERT', 'OFFLINE', 'CRITICAL');

CREATE TYPE "OSStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CLIENT',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "OSPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Tipo de serviço da O.S
CREATE TYPE "ServiceType" AS ENUM (
  'PREVENTIVA',
  'CORRETIVA',
  'EMERGENCIA',
  'LIMPEZA',
  'OUTROS'
);

CREATE TYPE "TicketCategory" AS ENUM (
  'MONITORING',
  'INVERTER',
  'PANELS',
  'CLEANING',
  'INVOICE',
  'OTHERS'
);

CREATE TYPE "TicketStatus" AS ENUM (
  'OPEN',
  'ANALYSING',
  'IN_PROGRESS',
  'COMPLETED'
);

-- ────────────────────────────────────────────────────────────
-- 2. USUÁRIOS DO SISTEMA (técnicos, admins, gestores)
-- ────────────────────────────────────────────────────────────
CREATE TABLE "User" (
    "id"        TEXT        NOT NULL,
    "email"     TEXT        NOT NULL,
    "password"  TEXT        NOT NULL,
    "name"      TEXT        NOT NULL,
    "role"      "Role"      NOT NULL DEFAULT 'CLIENTE',
    "phone"     TEXT,                             -- telefone do técnico
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- ────────────────────────────────────────────────────────────
-- 3. CLIENTES (donos das usinas)
-- ────────────────────────────────────────────────────────────
CREATE TABLE "Client" (
    "id"               TEXT           NOT NULL,
    "name"             TEXT           NOT NULL,
    "document"         TEXT           NOT NULL,  -- CPF ou CNPJ
    "phone"            TEXT           NOT NULL,
    "whatsapp"         TEXT           NOT NULL,
    "email"            TEXT           NOT NULL,
    "zipCode"          TEXT           NOT NULL,
    "address"          TEXT           NOT NULL,
    "city"             TEXT           NOT NULL,
    "state"            TEXT           NOT NULL,
    "installationDate" TIMESTAMP(3)   NOT NULL,
    "status"           "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "gpsLatitude"      DOUBLE PRECISION,
    "gpsLongitude"     DOUBLE PRECISION,
    "createdAt"        TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"           TEXT,                     -- vínculo com User para acesso ao app

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Client_document_key" ON "Client"("document");
CREATE UNIQUE INDEX "Client_email_key"    ON "Client"("email");
CREATE UNIQUE INDEX "Client_userId_key"   ON "Client"("userId");

-- ────────────────────────────────────────────────────────────
-- 4. USINAS SOLARES
-- ────────────────────────────────────────────────────────────
CREATE TABLE "Usina" (
    "id"               TEXT          NOT NULL,
    "name"             TEXT          NOT NULL,
    "clientId"         TEXT          NOT NULL,
    "capacityKwp"      DOUBLE PRECISION NOT NULL,
    "inverterCapacity" DOUBLE PRECISION NOT NULL,
    "moduleCount"      INTEGER       NOT NULL,
    "manufacturer"     TEXT          NOT NULL,
    "model"            TEXT          NOT NULL,
    "gpsLatitude"      DOUBLE PRECISION,
    "gpsLongitude"     DOUBLE PRECISION,
    "utilityCompany"   TEXT          NOT NULL,   -- distribuidora de energia
    "estimatedKwh"     DOUBLE PRECISION NOT NULL,
    "paybackYears"     DOUBLE PRECISION NOT NULL,
    "installationDate" TIMESTAMP(3)  NOT NULL,
    "approvalDate"     TIMESTAMP(3),
    "status"           "UsinaStatus" NOT NULL DEFAULT 'OFFLINE',
    "datalogger"       TEXT          NOT NULL DEFAULT '',  -- SN do datalogger
    "address"          TEXT          NOT NULL DEFAULT '',
    "city"             TEXT          NOT NULL DEFAULT '',
    "state"            TEXT          NOT NULL DEFAULT '',
    "minEnergyPeak"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxEnergyPeak"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usina_pkey" PRIMARY KEY ("id")
);

-- ────────────────────────────────────────────────────────────
-- 5. FATURAS / CONTAS DE ENERGIA
-- ────────────────────────────────────────────────────────────
CREATE TABLE "Invoice" (
    "id"             TEXT          NOT NULL,
    "usinaId"        TEXT          NOT NULL,
    "competence"     TEXT          NOT NULL,     -- Ex: "05/2026"
    "consumptionKwh" DOUBLE PRECISION NOT NULL,
    "generationKwh"  DOUBLE PRECISION NOT NULL,
    "amount"         DOUBLE PRECISION NOT NULL,  -- valor da conta R$
    "savings"        DOUBLE PRECISION NOT NULL,  -- economia obtida R$
    "pdfUrl"         TEXT,
    "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- ────────────────────────────────────────────────────────────
-- 6. ORDENS DE SERVIÇO (manutenção)
-- ────────────────────────────────────────────────────────────
CREATE TABLE "WorkOrder" (
    "id"            TEXT          NOT NULL,
    "number"        SERIAL        NOT NULL,      -- numeração automática
    "clientId"      TEXT          NOT NULL,
    "usinaId"       TEXT          NOT NULL,
    "description"   TEXT          NOT NULL,      -- descrição do problema / serviço
    "priority"      "OSPriority"  NOT NULL DEFAULT 'MEDIUM',
    "status"        "OSStatus"    NOT NULL DEFAULT 'OPEN',
    "technicianId"  TEXT,                        -- técnico responsável
    "serviceType"   "ServiceType" NOT NULL DEFAULT 'CORRETIVA',
    "scheduledAt"   TIMESTAMP(3),               -- data/hora agendada
    "completedAt"   TIMESTAMP(3),               -- data/hora real de conclusão
    "notes"         TEXT,                        -- relatório de campo (visível ao cliente)
    "internalNotes" TEXT,                        -- anotações internas (só para a equipe)
    "laborCost"     DOUBLE PRECISION DEFAULT 0,  -- custo de mão de obra R$
    "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkOrder_number_key" ON "WorkOrder"("number");

-- ────────────────────────────────────────────────────────────
-- 7. PEÇAS E MATERIAIS DA O.S
-- ────────────────────────────────────────────────────────────
CREATE TABLE "WorkOrderPart" (
    "id"          TEXT             NOT NULL,
    "workOrderId" TEXT             NOT NULL,
    "description" TEXT             NOT NULL,     -- nome da peça / material
    "quantity"    DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit"        TEXT             NOT NULL DEFAULT 'un',  -- un, m, kg, L, etc.
    "unitCost"    DOUBLE PRECISION NOT NULL DEFAULT 0,     -- custo unitário R$
    "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderPart_pkey" PRIMARY KEY ("id")
);

-- ────────────────────────────────────────────────────────────
-- 8. CHAMADOS DE SUPORTE (abertos pelo cliente ou equipe)
-- ────────────────────────────────────────────────────────────
CREATE TABLE "Ticket" (
    "id"          TEXT              NOT NULL,
    "clientId"    TEXT              NOT NULL,
    "category"    "TicketCategory"  NOT NULL,
    "title"       TEXT              NOT NULL,
    "description" TEXT              NOT NULL,
    "status"      "TicketStatus"    NOT NULL DEFAULT 'OPEN',
    "resolution"  TEXT,                          -- texto de resolução ao fechar
    "workOrderId" TEXT,                          -- O.S vinculada (se gerada a partir deste chamado)
    "createdAt"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- ────────────────────────────────────────────────────────────
-- 8b. REGISTROS FINANCEIROS (Contas a Pagar / Receber)
-- ────────────────────────────────────────────────────────────
CREATE TABLE "FinancialRecord" (
    "id"               TEXT             NOT NULL,
    "type"             TEXT             NOT NULL,     -- "PAGAR" ou "RECEBER"
    "description"      TEXT             NOT NULL,
    "amount"           DOUBLE PRECISION NOT NULL,
    "dueDate"          TIMESTAMP(3)     NOT NULL,     -- Data de vencimento
    "entryDate"        TIMESTAMP(3)     NOT NULL,     -- Data de entrada da nota / emissão
    "status"           TEXT             NOT NULL,     -- "PAGO", "PENDENTE", "VENCIDO", "ATRASADO"
    "paymentDate"      TIMESTAMP(3),                  -- Data de pagamento / recebimento
    "supplierOrClient" TEXT             NOT NULL,     -- Nome do fornecedor ou do cliente
    "ticketInfo"       TEXT,                          -- Informação do boleto
    "observations"     TEXT,                          -- Observações
    "clientId"         TEXT,                          -- Vínculo com cliente (opcional)
    "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialRecord_pkey" PRIMARY KEY ("id")
);

-- ────────────────────────────────────────────────────────────
-- 8c. CONTAS GMAIL CONECTADAS (OAuth2)
-- ────────────────────────────────────────────────────────────
CREATE TABLE "GmailAccount" (
    "id"           TEXT         NOT NULL,
    "email"        TEXT         NOT NULL,
    "name"         TEXT,
    "refreshToken" TEXT         NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GmailAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GmailAccount_email_key" ON "GmailAccount"("email");

-- ────────────────────────────────────────────────────────────
-- 9. FOREIGN KEYS
-- ────────────────────────────────────────────────────────────

-- Client ↔ User
ALTER TABLE "Client"
  ADD CONSTRAINT "Client_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Usina ↔ Client
ALTER TABLE "Usina"
  ADD CONSTRAINT "Usina_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Invoice ↔ Usina
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_usinaId_fkey"
  FOREIGN KEY ("usinaId") REFERENCES "Usina"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- WorkOrder ↔ Client
ALTER TABLE "WorkOrder"
  ADD CONSTRAINT "WorkOrder_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- WorkOrder ↔ Usina
ALTER TABLE "WorkOrder"
  ADD CONSTRAINT "WorkOrder_usinaId_fkey"
  FOREIGN KEY ("usinaId") REFERENCES "Usina"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- WorkOrder ↔ Technician (User)
ALTER TABLE "WorkOrder"
  ADD CONSTRAINT "WorkOrder_technicianId_fkey"
  FOREIGN KEY ("technicianId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- WorkOrderPart ↔ WorkOrder
ALTER TABLE "WorkOrderPart"
  ADD CONSTRAINT "WorkOrderPart_workOrderId_fkey"
  FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Ticket ↔ Client
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Ticket ↔ WorkOrder (vínculo opcional: chamado que gerou uma O.S)
ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_workOrderId_fkey"
  FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- FinancialRecord ↔ Client
ALTER TABLE "FinancialRecord"
  ADD CONSTRAINT "FinancialRecord_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────
-- 10. ÍNDICES DE PERFORMANCE
-- ────────────────────────────────────────────────────────────
CREATE INDEX "Usina_clientId_idx"        ON "Usina"("clientId");
CREATE INDEX "WorkOrder_clientId_idx"    ON "WorkOrder"("clientId");
CREATE INDEX "WorkOrder_usinaId_idx"     ON "WorkOrder"("usinaId");
CREATE INDEX "WorkOrder_technicianId_idx" ON "WorkOrder"("technicianId");
CREATE INDEX "WorkOrder_status_idx"      ON "WorkOrder"("status");
CREATE INDEX "WorkOrderPart_workOrderId_idx" ON "WorkOrderPart"("workOrderId");
CREATE INDEX "Ticket_clientId_idx"       ON "Ticket"("clientId");
CREATE INDEX "Ticket_status_idx"         ON "Ticket"("status");
CREATE INDEX "Invoice_usinaId_idx"       ON "Invoice"("usinaId");
CREATE INDEX "FinancialRecord_clientId_idx" ON "FinancialRecord"("clientId");

-- ────────────────────────────────────────────────────────────
-- 11. TRIGGER: atualiza updatedAt automaticamente
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_updatedAt"
  BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "Client_updatedAt"
  BEFORE UPDATE ON "Client"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "Usina_updatedAt"
  BEFORE UPDATE ON "Usina"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "Invoice_updatedAt"
  BEFORE UPDATE ON "Invoice"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "WorkOrder_updatedAt"
  BEFORE UPDATE ON "WorkOrder"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "Ticket_updatedAt"
  BEFORE UPDATE ON "Ticket"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "FinancialRecord_updatedAt"
  BEFORE UPDATE ON "FinancialRecord"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER "GmailAccount_updatedAt"
  BEFORE UPDATE ON "GmailAccount"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- 12. ROW LEVEL SECURITY (recomendado no Supabase)
-- ────────────────────────────────────────────────────────────
-- O sistema usa autenticação própria (header x-user-role) via NestJS.
-- O RLS fica desativado para as tabelas que o backend acessa diretamente.
-- Se quiser ativar RLS futuramente, use as policies abaixo como ponto de partida.

ALTER TABLE "User"          DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Client"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Usina"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice"       DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkOrder"     DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkOrderPart" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialRecord" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "GmailAccount"    DISABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 13. DADOS INICIAIS (admin padrão do sistema)
-- ────────────────────────────────────────────────────────────
-- Senha padrão: "setec2024" (você deve trocar após o primeiro acesso)
-- Hash gerado com bcrypt rounds=10 (gere um novo com: https://bcrypt.online/)
INSERT INTO "User" ("id", "email", "password", "name", "role", "updatedAt")
VALUES (
  gen_random_uuid()::TEXT,
  'empresasetecsolar@gmail.com',
  '$2b$10$xKB4z0HdoLSWDzT6WIKfzOq9Xv7vNJ2yWvEzA7k6GHsNrVtXqZdPe',
  'SETEC Solar e Segurança',
  'SUPER_ADMIN',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- FIM DO SCRIPT
-- ────────────────────────────────────────────────────────────
