const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const usinas = await prisma.usina.findMany();
  for (const u of usinas) {
    if (u.name.includes("Tadeu Casa")) {
      console.log(`Usina: ${u.name}, lat: ${u.gpsLatitude}, lng: ${u.gpsLongitude}`);
      await prisma.usina.update({
        where: { id: u.id },
        data: { gpsLatitude: -5.1875, gpsLongitude: -37.34417 }
      });
      const u2 = await prisma.usina.findUnique({where:{id: u.id}});
      console.log(`After Update -> lat: ${u2.gpsLatitude}, lng: ${u2.gpsLongitude}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
