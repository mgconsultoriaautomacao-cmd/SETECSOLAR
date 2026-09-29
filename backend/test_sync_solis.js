const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function makeSolisRequest(path, bodyObj, keyId, keySecret) {
  const contentMd5 = crypto.createHash('md5').update(JSON.stringify(bodyObj)).digest('base64');
  const contentType = 'application/json';
  const dateStr = new Date().toUTCString();
  const stringToSign = `POST\n${contentMd5}\n${contentType}\n${dateStr}\n${path}`;
  const hmac = crypto.createHmac('sha1', keySecret);
  hmac.update(stringToSign);
  const signature = hmac.digest('base64');
  const authHeader = `API ${keyId}:${signature}`;

  const res = await axios.post(`https://www.soliscloud.com:13333${path}`, bodyObj, {
    headers: {
      'Content-Type': contentType,
      'Content-MD5': contentMd5,
      'Date': dateStr,
      'Authorization': authHeader,
    },
    timeout: 10000,
  });
  return res.data;
}

async function syncSolisNow() {
  console.log('--- BUSCANDO USINAS DA SOLISCLOUD ---');
  const supplier = await prisma.dataloggerSupplier.findFirst({ where: { type: 'SOLIS_CLOUD' } });
  if (!supplier) {
    console.error('Fornecedor SolisCloud não encontrado.');
    return;
  }

  const keyId = supplier.appId || process.env.SOLIS_KEY_ID;
  const keySecret = supplier.appSecret || process.env.SOLIS_KEY_SECRET;

  const res = await makeSolisRequest('/v1/api/userStationList', { pageNo: 1, pageSize: 50 }, keyId, keySecret);
  const stations = res?.data?.page?.records || [];
  console.log(`Encontradas ${stations.length} estações na SolisCloud.`);

  for (const st of stations) {
    const stationName = st.stationName || st.name || `Solis ${st.id}`;
    const stationId = String(st.id || '');
    const cap = parseFloat(st.capacity || st.capacityKwp) || 8.0;

    console.log(`\nProcessando estação Solis: "${stationName}" (ID: ${stationId}, Cap: ${cap} kWp)...`);

    // Busca ou cria cliente
    let client = await prisma.client.findFirst({
      where: { name: { contains: stationName, mode: 'insensitive' } }
    });

    if (!client) {
      const doc = `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 900 + 100)}`;
      client = await prisma.client.create({
        data: {
          name: stationName,
          document: doc,
          phone: '84999999999',
          whatsapp: '84999999999',
          email: `solis_${stationId}@setecsolar.com`,
          zipCode: '59660000',
          address: st.cityStr ? `${st.cityStr}` : 'Instalação Solar Solis',
          city: st.cityStr || 'Tibau',
          state: 'RN',
          installationDate: new Date(),
        }
      });
      console.log(`  👤 Cliente criado: ${client.name} (ID: ${client.id})`);
    } else {
      console.log(`  👤 Cliente existente: ${client.name} (ID: ${client.id})`);
    }

    // Busca inversor(es) da estação
    let invSn = stationId;
    try {
      const invRes = await makeSolisRequest('/v1/api/inverterList', { pageNo: 1, pageSize: 50, stationId }, keyId, keySecret);
      const invs = invRes?.data?.page?.records || [];
      if (invs.length > 0 && invs[0].sn) {
        invSn = invs[0].sn;
        console.log(`  🔌 Inversor encontrado: SN ${invSn}`);
      }
    } catch (e) {
      console.log(`  ⚠️ Não foi possível listar inversores específicos para stationId ${stationId}: ${e.message}`);
    }

    // Verifica se usina já existe
    const existing = await prisma.usina.findFirst({
      where: {
        OR: [
          { datalogger: invSn },
          { datalogger: stationId },
          { name: { contains: stationName, mode: 'insensitive' } }
        ]
      }
    });

    const kwhToday = parseFloat(st.dayEnergy || st.etoday || '0');
    const kwhTotal = parseFloat(st.allEnergy || st.etotal || '0');
    const powerKw = parseFloat(st.dayPower || st.pac || '0');

    if (existing) {
      const updated = await prisma.usina.update({
        where: { id: existing.id },
        data: {
          name: stationName,
          clientId: client.id,
          capacityKwp: cap,
          inverterCapacity: cap,
          datalogger: invSn,
          dataloggerSupplierId: supplier.id,
          status: 'ONLINE',
          powerNow: powerKw > 0 ? powerKw : existing.powerNow,
          generationToday: kwhToday > 0 ? kwhToday : existing.generationToday,
          generationTotal: kwhTotal > 0 ? kwhTotal : existing.generationTotal,
          readingLastUpdate: new Date(),
        }
      });
      console.log(`  ✅ Usina ATUALIZADA no banco: "${updated.name}" (ID: ${updated.id})`);
    } else {
      const created = await prisma.usina.create({
        data: {
          name: stationName,
          clientId: client.id,
          capacityKwp: cap,
          inverterCapacity: cap,
          moduleCount: Math.round(cap * 2),
          manufacturer: 'Solis',
          model: 'Solis Cloud Inverter',
          utilityCompany: 'Cosern / Neoenergia',
          estimatedKwh: cap * 135,
          paybackYears: 3.5,
          installationDate: new Date(),
          status: 'ONLINE',
          datalogger: invSn,
          city: st.cityStr || 'Tibau',
          state: 'RN',
          address: 'Instalação Solis',
          dataloggerSupplierId: supplier.id,
          powerNow: powerKw,
          generationToday: kwhToday,
          generationTotal: kwhTotal,
          readingLastUpdate: new Date(),
        }
      });
      console.log(`  🎉 Usina CRIADA no banco com sucesso: "${created.name}" (ID: ${created.id})`);
    }
  }
}

syncSolisNow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
