const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const supplierId = '7c9fa640-e3e2-4f3d-a967-74d5cc1fa25b';
  const plantName = 'Gleston';
  const inverterSn = '010AF121A070070';
  const capacityKwp = 8.0;

  // 1. Cria ou busca cliente Gleston
  let client = await prisma.client.findFirst({
    where: { name: { contains: 'Gleston', mode: 'insensitive' } }
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: 'Gleston',
        document: '00000000003',
        phone: '84999999999',
        whatsapp: '84999999999',
        email: 'gleston@setecsolar.com',
        zipCode: '59660000',
        address: 'Rua João Mateus',
        city: 'Tibau',
        state: 'RN',
        installationDate: new Date('2023-03-09'),
      }
    });
    console.log('👤 Cliente Gleston criado:', client.id);
  } else {
    console.log('👤 Cliente Gleston existente:', client.id);
  }

  // 2. Cria ou atualiza a Usina Gleston
  const existingUsina = await prisma.usina.findFirst({
    where: {
      OR: [
        { datalogger: inverterSn },
        { name: { contains: 'Gleston', mode: 'insensitive' } }
      ]
    }
  });

  if (existingUsina) {
    const updated = await prisma.usina.update({
      where: { id: existingUsina.id },
      data: {
        name: 'Gleston — 010AF121A070070',
        clientId: client.id,
        capacityKwp: capacityKwp,
        inverterCapacity: capacityKwp,
        moduleCount: 16,
        manufacturer: 'Solis',
        model: 'Solis-1P8K-5G Brazil',
        status: 'ONLINE',
        datalogger: inverterSn,
        city: 'Tibau',
        state: 'RN',
        address: 'Rua João Mateus',
        dataloggerSupplierId: supplierId,
        powerNow: 0.02,
        generationToday: 26.9,
        generationTotal: 32843.0,
        readingLastUpdate: new Date(),
      }
    });
    console.log('🏭 Usina Gleston atualizada com sucesso:', updated.id);
  } else {
    const created = await prisma.usina.create({
      data: {
        name: 'Gleston — 010AF121A070070',
        clientId: client.id,
        capacityKwp: capacityKwp,
        inverterCapacity: capacityKwp,
        moduleCount: 16,
        manufacturer: 'Solis',
        model: 'Solis-1P8K-5G Brazil',
        utilityCompany: 'Cosern / Neoenergia RN',
        estimatedKwh: capacityKwp * 135,
        paybackYears: 3.5,
        installationDate: new Date('2023-03-09'),
        status: 'ONLINE',
        datalogger: inverterSn,
        city: 'Tibau',
        state: 'RN',
        address: 'Rua João Mateus',
        dataloggerSupplierId: supplierId,
        powerNow: 0.02,
        generationToday: 26.9,
        generationTotal: 32843.0,
        readingLastUpdate: new Date(),
      }
    });
    console.log('🏭 Usina Gleston criada com sucesso:', created.id);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
