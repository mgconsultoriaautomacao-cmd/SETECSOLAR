import { PrismaClient } from '@prisma/client';

async function test(name: string, url: string) {
  console.log(`🔌 Testando: ${name}...`);
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    const start = Date.now();
    await prisma.$connect();
    const count = await prisma.user.count();
    console.log(`✅ ${name} CONECTADO! Tempo: ${Date.now() - start}ms. Total usuários: ${count}`);
    return true;
  } catch (e: any) {
    console.error(`❌ Erro no teste ${name}:`, (e.message || e).trim());
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const host = "aws-0-us-west-2.pooler.supabase.com";
  
  // 1. Session Mode (Porta 5432) com tenant no usuário
  await test(
    "Session Mode (Porta 5432, user: postgres.ref)",
    `postgresql://postgres.dpmpxuahlpxucqeonrhk:Dianaestefane1%40@${host}:5432/postgres?connection_limit=1`
  );

  // 2. Transaction Mode (Porta 6543) com usuário simples
  await test(
    "Transaction Mode (Porta 6543, user: postgres)",
    `postgresql://postgres:Dianaestefane1%40@${host}:6543/postgres?pgbouncer=true&connection_limit=1`
  );

  // 3. Session Mode (Porta 5432) com usuário simples
  await test(
    "Session Mode (Porta 5432, user: postgres)",
    `postgresql://postgres:Dianaestefane1%40@${host}:5432/postgres?connection_limit=1`
  );
}

run();
