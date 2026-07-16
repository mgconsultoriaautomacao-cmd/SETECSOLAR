const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- DB Check ---');
  try {
    const suppliers = await prisma.dataloggerSupplier.findMany();
    console.log('Registered suppliers count:', suppliers.length);
    console.log('Suppliers:', JSON.stringify(suppliers, null, 2));

    const dataloggers = await prisma.datalogger.findMany();
    console.log('Registered dataloggers count:', dataloggers.length);
    console.log('Dataloggers:', JSON.stringify(dataloggers, null, 2));
  } catch (err) {
    console.error('❌ Error querying database:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
