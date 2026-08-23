require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NEW_TOKEN = '7t7ts5jz723e1ah3yn684m7ce03d7087';

async function main() {
  // Busca todos os fornecedores Growatt
  const growatts = await prisma.dataloggerSupplier.findMany({
    where: { type: 'GROWATT_CLOUD' },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Encontrados ${growatts.length} fornecedor(es) Growatt no banco.`);

  if (growatts.length > 1) {
    // Mantém o mais antigo (id original) e remove os demais
    const keep = growatts[0];
    const toDelete = growatts.slice(1).map(g => g.id);

    // Atualiza o token do principal
    await prisma.dataloggerSupplier.update({
      where: { id: keep.id },
      data: { token: NEW_TOKEN }
    });
    console.log('✅ Token atualizado no fornecedor principal:', keep.name, '| id:', keep.id);

    // Remove duplicatas (só se não tiver usinas vinculadas)
    for (const delId of toDelete) {
      const linked = await prisma.usina.count({ where: { dataloggerSupplierId: delId } });
      if (linked === 0) {
        await prisma.dataloggerSupplier.delete({ where: { id: delId } });
        console.log('🗑️  Duplicata removida | id:', delId);
      } else {
        // Se tiver usinas vinculadas, redireciona para o principal e apaga
        await prisma.usina.updateMany({
          where: { dataloggerSupplierId: delId },
          data: { dataloggerSupplierId: keep.id }
        });
        await prisma.dataloggerSupplier.delete({ where: { id: delId } });
        console.log('🔀 Usinas redirecionadas para fornecedor principal e duplicata removida | id:', delId);
      }
    }
  } else if (growatts.length === 1) {
    await prisma.dataloggerSupplier.update({
      where: { id: growatts[0].id },
      data: { token: NEW_TOKEN }
    });
    console.log('✅ Token atualizado:', growatts[0].name, '| id:', growatts[0].id);
  }

  // Lista final
  const all = await prisma.dataloggerSupplier.findMany({
    select: { id: true, name: true, type: true, token: true }
  });
  console.log('\n📋 Fornecedores finais no banco:');
  all.forEach(s => {
    const tok = s.token ? s.token.substring(0, 8) + '***' : 'VAZIO';
    console.log(`  - ${s.name} | ${s.type} | token: ${tok}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
