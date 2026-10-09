const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  console.log('--- FORNECEDORES ---');
  const suppliers = await prisma.dataloggerSupplier.findMany();
  console.log(suppliers.map(s => ({ id: s.id, name: s.name, type: s.type, appId: s.appId, username: s.username })));

  console.log('\n--- USINAS ---');
  const usinas = await prisma.usina.findMany({ include: { client: true, dataloggerSupplier: true } });
  console.log(usinas.map(u => ({
    id: u.id,
    name: u.name,
    client: u.client?.name,
    datalogger: u.datalogger,
    supplier: u.dataloggerSupplier?.name,
    supplierType: u.dataloggerSupplier?.type,
    powerNow: u.powerNow,
    generationToday: u.generationToday,
    generationTotal: u.generationTotal,
    status: u.status,
    readingLastUpdate: u.readingLastUpdate
  })));
}

checkDb().catch(console.error).finally(() => prisma.$disconnect());
