import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.dataloggerSupplier.updateMany({
    where: { type: 'GROWATT_CLOUD' },
    data: { token: '3b4eyuhm081vo6301x18e66l05b9kcjh' }
  });
  console.log('Updated suppliers:', updated);
}

main().catch(console.error).finally(() => prisma.$disconnect());
