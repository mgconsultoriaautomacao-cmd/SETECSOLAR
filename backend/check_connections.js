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

// ─── 3. GROWATT API ───────────────────────────────────────────────────────────
async function checkGrowatt() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  3. GROWATT OpenAPI');
  console.log('══════════════════════════════════════════════');

  const token = process.env.GROWATT_API_TOKEN;
  if (!token) {
    console.log(WARN('GROWATT_API_TOKEN não definido no .env'));
    return;
  }

  const urls = [
    { label: 'PlantList (v1)',    url: `https://openapi.growatt.com/v1/plant/list?token=${token}` },
    { label: 'User info (v1)',    url: `https://openapi.growatt.com/v1/user/info?token=${token}` },
  ];

  for (const { label, url } of urls) {
    try {
      const res = await axios.get(url, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });
      const body = res.data;
      const code = body?.error_code ?? body?.code ?? res.status;
      const msg  = body?.error_msg  ?? body?.msg  ?? '';
      if (res.status === 200 && (code === 0 || code === '0' || code === 200)) {
        console.log(OK(`[${label}] OK — code: ${code}`));
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
  console.log('  4. SOLPLANET Pro Cloud API');
  console.log('══════════════════════════════════════════════');

  const APP_KEY    = '205024856';
  const APP_SECRET = 'QT3qSt0ntxTI8JminCull8p2066zCDnZ';
  const TOKEN      = 'N1YyRFB4aHF3T2tTTmJvMjZyNDF0QT09';
  const BASE_URL   = 'https://pro-cloud.solplanet.net';

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

  const endpoints = [
    { label: 'getPlanListPro', path: '/api/pro/getPlanListPro', params: { apikey: APP_KEY, token: TOKEN } },
    { label: 'getPlantOverviewPro', path: '/api/pro/getPlantOverviewPro', params: { apikey: APP_KEY, token: TOKEN } },
  ];

  for (const { label, path, params } of endpoints) {
    const qs = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    const endpoint = `${path}?${qs}`;
    const headers = makeHeaders(endpoint);
    const url = `${BASE_URL}${endpoint}`;

    try {
      const res = await axios.get(url, {
        headers,
        timeout: 10000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      });
      const code = res.data?.code ?? res.data?.status ?? res.status;
      console.log(OK(`[${label}] OK — status HTTP: ${res.status} | code: ${code}`));
    } catch (e) {
      if (e.response) {
        const errMsg = e.response.headers['x-ca-error-message'] || '';
        const errCode = e.response.headers['x-ca-error-code'] || '';
        console.log(FAIL(`[${label}] ${e.response.status} | ${errCode} | ${errMsg} | ${JSON.stringify(e.response.data).substring(0, 200)}`));
      } else {
        console.log(FAIL(`[${label}] ${e.message}`));
      }
    }
  }
}

// ─── 5. SOLARMAN API ─────────────────────────────────────────────────────────
async function checkSolarman() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  5. SOLARMAN PV API');
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
  await checkSolplanet();
  await checkSolarman();

  console.log('\n══════════════════════════════════════════════');
  console.log('  Diagnóstico concluído.');
  console.log('══════════════════════════════════════════════\n');
}

main().catch(console.error);
