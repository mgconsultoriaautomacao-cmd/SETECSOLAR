const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client with SQLite provider URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

async function main() {
  try {
    const suppliers = await prisma.dataloggerSupplier.findMany();
    console.log('Suppliers in dev.db:', JSON.stringify(suppliers, null, 2));
  } catch (error) {
    console.error('Error reading dev.db:', error.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
