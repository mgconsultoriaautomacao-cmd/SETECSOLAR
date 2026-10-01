const { PrismaClient } = require('./node_modules/@prisma/client');
const axios = require('./node_modules/axios');

const prisma = new PrismaClient();

async function seedGoodWe() {
  console.log('--- Cadastrando / Atualizando Fornecedor GoodWe SEMS Portal ---');

  const supplierData = {
    name: 'GoodWe SEMS Portal (SETEC SOLAR)',
    type: 'GOODWE_CLOUD',
    username: 'setecsolarseg@gmail.com',
    appId: 'fL6qA3o4a3H0LCXAWBNI5kscQk2kPauH',
    appSecret: 'zFt7CdQo2bjANAFUjrPwYtRm9hg8XaYrHX2Wv4zJw5VGTF6hcCTntBHthgxKKO88',
    token: 'Admin@123',
    password: 'Admin@123',
  };

  try {

    const existing = await prisma.dataloggerSupplier.findFirst({
      where: {
        OR: [
          { type: 'GOODWE_CLOUD' },
          { name: { contains: 'GoodWe', mode: 'insensitive' } }
        ]
      }
    });

    if (existing) {
      console.log(`Atualizando fornecedor GoodWe existente (ID: ${existing.id})...`);
      const updated = await prisma.dataloggerSupplier.update({
        where: { id: existing.id },
        data: supplierData
      });
      console.log('✅ Atualizado via Prisma:', updated);
    } else {
      console.log('Criando novo fornecedor GoodWe via Prisma...');
      const created = await prisma.dataloggerSupplier.create({
        data: supplierData
      });
      console.log('✅ Criado via Prisma:', created);
    }
  } catch (err) {
    console.warn('Erro ao acessar via Prisma direto (IPv6 / Soquetes). Tentando via Supabase REST API...', err.message);

    // 2. Fallback via Supabase REST
    const supabaseUrl = process.env.SUPABASE_URL || 'https://syazuhgqvhsswqujvyck.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!serviceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.');
      return;
    }

    try {
      const getRes = await axios.get(`${supabaseUrl}/rest/v1/DataloggerSupplier?type=eq.GOODWE_CLOUD`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      });

      if (getRes.data && getRes.data.length > 0) {
        const id = getRes.data[0].id;
        const patchRes = await axios.patch(`${supabaseUrl}/rest/v1/DataloggerSupplier?id=eq.${id}`, supplierData, {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Atualizado via Supabase REST:', patchRes.data);
      } else {
        const postRes = await axios.post(`${supabaseUrl}/rest/v1/DataloggerSupplier`, supplierData, {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Criado via Supabase REST:', postRes.data);
      }
    } catch (restErr) {
      console.error('Erro no fallback REST:', restErr.response?.data || restErr.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

seedGoodWe();
