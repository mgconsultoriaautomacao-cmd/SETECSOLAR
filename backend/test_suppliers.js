const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showSuppliersAndSolis() {
  const suppliers = await prisma.dataloggerSupplier.findMany();
  console.log('=== FORNECEDORES ===');
  console.log(JSON.stringify(suppliers, null, 2));

  const solisUsinas = await prisma.usina.findMany({
    where: {
      OR: [
        { dataloggerSupplier: { type: { in: ['SOLIS', 'SOLIS_CLOUD', 'SOFAR', 'SOFAR_CLOUD'] } } },
        { name: { contains: 'Gleston', mode: 'insensitive' } },
        { name: { contains: 'boomerang', mode: 'insensitive' } },
        { name: { contains: 'ELIZABETE', mode: 'insensitive' } }
      ]
    },
    include: { dataloggerSupplier: true, client: true }
  });
  console.log('=== USINAS SOLIS / SOFAR / GLESTON ===');
  console.log(JSON.stringify(solisUsinas.map(u => ({ id: u.id, name: u.name, datalogger: u.datalogger, supplier: u.dataloggerSupplier?.name, client: u.client?.name })), null, 2));
}

showSuppliersAndSolis().catch(console.error).finally(() => prisma.$disconnect());
