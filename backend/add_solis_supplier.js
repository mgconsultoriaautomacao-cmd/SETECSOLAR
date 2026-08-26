const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const keyId = '1300386381676729641';
  const keySecret = 'c526acc1c0ec4e57b12f42c3ff922ee8';

  const existing = await prisma.dataloggerSupplier.findFirst({
    where: {
      OR: [
        { type: 'SOLIS_CLOUD' },
        { name: { contains: 'Solis', mode: 'insensitive' } }
      ]
    }
  });

  if (existing) {
    const updated = await prisma.dataloggerSupplier.update({
      where: { id: existing.id },
      data: {
        name: 'SolisCloud',
        type: 'SOLIS_CLOUD',
        appId: keyId,
        appSecret: keySecret,
      }
    });
    console.log('✅ Fornecedor Solis atualizado:', updated);
  } else {
    const created = await prisma.dataloggerSupplier.create({
      data: {
        name: 'SolisCloud',
        type: 'SOLIS_CLOUD',
        appId: keyId,
        appSecret: keySecret,
      }
    });
    console.log('✅ Fornecedor Solis criado:', created);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
