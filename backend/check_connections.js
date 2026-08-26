/**
 * Script de Diagnóstico - SETEC ENERGIA
 * Verifica: Banco de dados (Supabase/Prisma) + APIs dos fornecedores
 */

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const https = require('https');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── Cores para console ───────────────────────────────────────────────────────
const OK   = (msg) => `✅ ${msg}`;
const FAIL = (msg) => `❌ ${msg}`;
const WARN = (msg) => `⚠️  ${msg}`;
const INFO = (msg) => `ℹ️  ${msg}`;

// ─── 1. BANCO DE DADOS ────────────────────────────────────────────────────────
async function checkDatabase() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  1. BANCO DE DADOS (Supabase / Prisma)');
  console.log('══════════════════════════════════════════════');
  console.log(INFO(`DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : 'NÃO DEFINIDA'}`));

  try {
    // Ping simples via query raw
    const result = await prisma.$queryRaw`SELECT NOW() as now, current_database() as db`;
    console.log(OK(`Conexão OK — DB: ${result[0].db} | Hora servidor: ${result[0].now}`));

    // Conta registros nas tabelas principais
    const tables = [
      { name: 'DataloggerSupplier', fn: () => prisma.dataloggerSupplier.count() },
      { name: 'Datalogger',         fn: () => prisma.datalogger.count() },
      { name: 'Client',             fn: () => prisma.client.count().catch(() => null) },
      { name: 'Usina',              fn: () => prisma.usina.count().catch(() => null) },
    ];

    for (const t of tables) {
      try {
        const count = await t.fn();
        if (count !== null) console.log(`   📊 ${t.name}: ${count} registro(s)`);
      } catch (e) {
        console.log(`   ${WARN(`${t.name}: tabela não acessível (${e.message})`)}`);
      }
    }
  } catch (err) {
    console.log(FAIL(`Falha na conexão com o banco: ${err.message}`));
  } finally {
    await prisma.$disconnect();
  }
}

// ─── 2. SUPABASE REST API ─────────────────────────────────────────────────────
async function checkSupabase() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  2. SUPABASE REST API');
  console.log('══════════════════════════════════════════════');

  const url  = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.log(WARN('SUPABASE_URL ou SUPABASE_ANON_KEY não definidos no .env'));
    return;
  }

  try {
    const res = await axios.get(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      timeout: 10000,
    });
    console.log(OK(`Supabase REST acessível — Status: ${res.status}`));
  } catch (e) {
    const status = e.response?.status;
    // 404 é esperado no endpoint raiz, significa que chegou no servidor
    if (status === 404 || status === 200) {
      console.log(OK(`Supabase REST acessível — Status: ${status}`));
    } else {
      console.log(FAIL(`Supabase REST falhou: ${e.message} (status: ${status || 'sem resposta'})`));
    }
  }
}

// ─── 3. GROWATT API ─────────────────────────────────────────────────
async function checkGrowatt() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  3. GROWATT OpenAPI');
  console.log('══════════════════════════════════════════════');

  // Busca token do banco primeiro, depois do .env
  let token = process.env.GROWATT_API_TOKEN;
  try {
    const dbSupplier = await prisma.dataloggerSupplier.findFirst({ where: { type: 'GROWATT_CLOUD' } });
    if (dbSupplier && dbSupplier.token) {
      token = dbSupplier.token;
      console.log(INFO('Token carregado do banco de dados.'));
    } else {
      console.log(INFO('Token carregado do .env.'));
    }
  } catch(e) { /* ignora erro ao buscar no banco */ }

  if (!token) {
    console.log(WARN('GROWATT_API_TOKEN não definido no .env nem no banco'));
    return;
  }

  const urls = [
    { label: 'PlantList (v1)',  url: `https://openapi.growatt.com/v1/plant/list` },
    { label: 'User info (v1)', url: `https://openapi.growatt.com/v1/user/info` },
  ];

  for (const { label, url } of urls) {
    try {
      const res = await axios.get(url, {
        timeout: 10000,
        headers: { token, 'Content-Type': 'application/x-www-form-urlencoded' },
        params: { page: 1, perpage: 5 },
      });
      const body = res.data;
      const code = body?.error_code ?? body?.code ?? res.status;
      const msg  = body?.error_msg  ?? body?.msg  ?? '';
      if (res.status === 200 && (code === 0 || code === '0' || code === 200)) {
        const plants = body?.data?.plants?.length ?? body?.data?.datas?.length ?? 0;
        console.log(OK(`[${label}] OK — code: ${code} | plantas: ${plants}`));
      } else if (code === 10011 || code === '10011') {
        console.log(FAIL(`[${label}] TOKEN EXPIRADO (code: 10011). Gere novo token em https://openapi.growatt.com`));
      } else {
        console.log(WARN(`[${label}] Resposta com code=${code} | msg: ${msg}`));
      }
    } catch (e) {
      const status = e.response?.status;
      const body   = JSON.stringify(e.response?.data || '').substring(0, 200);
      console.log(FAIL(`[${label}] Falhou — ${e.message} | status: ${status} | ${body}`));
    }
  }
}

// ─── 4. SOLPLANET API ─────────────────────────────────────────────────────────
async function checkSolplanet() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  4. SOLPLANET Aiswei Cloud API');
  console.log('══════════════════════════════════════════════');

  // Busca credenciais do banco de dados
  let APP_KEY, APP_SECRET, TOKEN;
  try {
    const dbSupplier = await prisma.dataloggerSupplier.findFirst({ where: { type: 'SOLPLANET_CLOUD' } });
    if (dbSupplier) {
      APP_KEY    = dbSupplier.appId     || '';
      APP_SECRET = dbSupplier.appSecret || '';
      TOKEN      = dbSupplier.token     || '';
      console.log(INFO('Credenciais Solplanet carregadas do banco.'));
    }
  } catch(e) { /* ignora erro ao buscar */ }

  if (!APP_KEY || !APP_SECRET || !TOKEN) {
    console.log(WARN('Credenciais Solplanet (appId/appSecret/token) não configuradas no banco.'));
    console.log(INFO('Configure o fornecedor SOLPLANET_CLOUD no banco com appId, appSecret e token.'));
    return;
  }

  // Hosts corretos — pro-cloud.solplanet.net retorna HTTP 444 (bloqueado)
  const HOSTS = [
    'https://eu-api-genergal.aisweicloud.com',
    'https://api.general.aisweicloud.com',
    'https://api-genergal.aisweicloud.com',
  ];

  function makeHeaders(endpoint) {
    const method = 'GET';
    const accept = 'application/json';
    const contentType = 'application/json; charset=UTF-8';
    const str = `${method}\n${accept}\n\n${contentType}\n\nX-Ca-Key:${APP_KEY}\n${endpoint}`;
    const sig = crypto.createHmac('sha256', APP_SECRET).update(str).digest('base64');
    return {
      'User-Agent': 'app 1.0',
      'Content-Type': contentType,
      'Accept': accept,
      'X-Ca-Signature-Headers': 'X-Ca-Key',
      'X-Ca-Key': APP_KEY,
      'X-Ca-Signature': sig,
    };
  }

  const qs = Object.keys({ apikey: APP_KEY, token: TOKEN }).sort()
    .map(k => k === 'apikey' ? `apikey=${APP_KEY}` : `token=${TOKEN}`).join('&');
  const endpoint = `/pro/getPlanListPro?${qs}`;
  const headers = makeHeaders(endpoint);

  let ok = false;
  for (const host of HOSTS) {
    const url = `${host}${endpoint}`;
    try {
      const res = await axios.get(url, {
        headers,
        timeout: 10000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });
      const code = res.data?.code ?? res.data?.status ?? res.status;
      console.log(OK(`[${host.split('//')[1]}] HTTP ${res.status} | code: ${code}`));
      ok = true;
      break;
    } catch (e) {
      if (e.response) {
        const errMsg = e.response.headers?.['x-ca-error-message'] || '';
        console.log(WARN(`[${host.split('//')[1]}] HTTP ${e.response.status} | ${errMsg || JSON.stringify(e.response.data).substring(0, 80)}`));
        ok = true; // host respondeu (mesmo com erro de auth)
      } else {
        console.log(INFO(`[${host.split('//')[1]}] sem resposta: ${e.message}`));
      }
    }
  }

  if (!ok) {
    console.log(FAIL('Nenhum host Solplanet/Aiswei respondeu. Verifique conectividade.'));
  }
}


// ─── 5. SOLIS CLOUD API ───────────────────────────────────────────────────────
async function checkSolis() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  5. SOLIS Cloud Open API');
  console.log('══════════════════════════════════════════════');

  const keyId = process.env.SOLIS_KEY_ID;
  const keySecret = process.env.SOLIS_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.log(WARN('Credenciais SolisCloud (SOLIS_KEY_ID, SOLIS_KEY_SECRET) não configuradas no .env'));
    return;
  }

  const path = '/v1/api/userStationList';
  const bodyStr = JSON.stringify({ pageNo: 1, pageSize: 10 });
  const contentMd5 = crypto.createHash('md5').update(bodyStr, 'utf8').digest('base64');
  const dateStr = new Date().toUTCString();
  const stringToSign = `POST\n${contentMd5}\napplication/json\n${dateStr}\n${path}`;
  const signature = crypto.createHmac('sha1', keySecret).update(stringToSign, 'utf8').digest('base64');

  try {
    const res = await axios.post(`https://www.soliscloud.com:13333${path}`, bodyStr, {
      headers: {
        'Content-Type': 'application/json',
        'Content-MD5': contentMd5,
        'Date': dateStr,
        'Authorization': `API ${keyId}:${signature}`,
      },
      timeout: 10000,
    });
    if (res.data?.code === '0') {
      const records = res.data?.data?.page?.records || [];
      console.log(OK(`SolisCloud API OK — código 0 | Usinas encontradas: ${records.length}`));
      records.forEach(r => console.log(`   🌱 [Solis] ${r.stationName} (Capacidade: ${r.capacity || r.installedCapacity} kWp)`));
    } else {
      console.log(WARN(`SolisCloud resposta: ${JSON.stringify(res.data)}`));
    }
  } catch (e) {
    console.log(FAIL(`SolisCloud falhou: ${e.message}`));
  }
}

// ─── 6. SOLARMAN API ─────────────────────────────────────────────────────────
async function checkSolarman() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  6. SOLARMAN PV API');
  console.log('══════════════════════════════════════════════');

  const appId     = process.env.SOLARMAN_APP_ID;
  const appSecret = process.env.SOLARMAN_APP_SECRET;
  const email     = process.env.SOLARMAN_EMAIL;
  const password  = process.env.SOLARMAN_PASSWORD;

  if (!appId || !appSecret || !email || !password) {
    console.log(WARN('Credenciais Solarman não configuradas no .env (SOLARMAN_APP_ID, APP_SECRET, EMAIL, PASSWORD)'));
    console.log(INFO('Pulando teste do Solarman...'));
    return;
  }

  try {
    const res = await axios.post(
      `https://globalapi.solarmanpv.com/account/v1.0/token?appId=${appId}&language=pt`,
      { appSecret, email, password },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );
    if (res.data?.access_token) {
      console.log(OK(`Solarman autenticação OK — token recebido`));
    } else {
      console.log(WARN(`Solarman retornou sem token: ${JSON.stringify(res.data).substring(0, 200)}`));
    }
  } catch (e) {
    console.log(FAIL(`Solarman falhou: ${e.message} | ${JSON.stringify(e.response?.data || '').substring(0, 200)}`));
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   SETEC ENERGIA — Diagnóstico de Conexões   ║');
  console.log(`║   ${new Date().toLocaleString('pt-BR')}                    ║`);
  console.log('╚══════════════════════════════════════════════╝');

  await checkDatabase();
  await checkSupabase();
  await checkGrowatt();
  await checkSolis();
  await checkSolplanet();
  await checkSolarman();

  console.log('\n══════════════════════════════════════════════');
  console.log('  Diagnóstico concluído.');
  console.log('══════════════════════════════════════════════\n');
}

main().catch(console.error);

