const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const usinas = await prisma.usina.findMany({
    include: { client: true, dataloggerSupplier: true }
  });
  console.log('Usinas:', JSON.stringify(usinas.map(u => ({
    id: u.id,
    name: u.name,
    client: u.client?.name,
    datalogger: u.datalogger,
    supplier: u.dataloggerSupplier?.name,
    status: u.status,
    powerNow: u.powerNow,
    generationToday: u.generationToday,
    generationTotal: u.generationTotal
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
