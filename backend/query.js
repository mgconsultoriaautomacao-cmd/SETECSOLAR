const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const usinas = await prisma.usina.findMany({
    include: { client: true },
  });
  console.log("Usinas:");
  console.log(JSON.stringify(usinas, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
