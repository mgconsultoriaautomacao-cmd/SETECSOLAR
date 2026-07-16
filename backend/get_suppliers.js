const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const suppliers = await prisma.dataloggerSupplier.findMany();
  console.log('Suppliers in database:', JSON.stringify(suppliers, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
