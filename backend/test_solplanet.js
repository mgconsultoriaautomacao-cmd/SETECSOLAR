const axios = require('axios');
const crypto = require('crypto');
const https = require('https');

const APP_KEY = '205024856';
const APP_SECRET = 'QT3qSt0ntxTI8JminCull8p2066zCDnZ';
const TOKEN = 'N1YyRFB4aHF3T2tTTmJvMjZyNDF0QT09';

// Host real do portal Pro!
const BASE_URL = 'https://pro-cloud.solplanet.net';

function makeHeaders(endpoint, xCaKey, xCaSecret) {
  const method = 'GET';
  const accept = 'application/json';
  const contentType = 'application/json; charset=UTF-8';
  const stringToSign = `${method}\n${accept}\n\n${contentType}\n\nX-Ca-Key:${xCaKey}\n${endpoint}`;
  const signature = crypto.createHmac('sha256', xCaSecret).update(stringToSign).digest('base64');
  return {
    'User-Agent': 'app 1.0',
    'Content-Type': contentType,
    'Accept': accept,
    'X-Ca-Signature-Headers': 'X-Ca-Key',
    'X-Ca-Key': xCaKey,
    'X-Ca-Signature': signature,
  };
}

async function test(label, path, params, appKey = APP_KEY, appSecret = APP_SECRET) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const endpoint = sorted ? `${path}?${sorted}` : path;
  const headers = makeHeaders(endpoint, appKey, appSecret);
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n[${label}]`);
  console.log('URL:', url);
  try {
    const r = await axios.get(url, {
      headers,
      timeout: 10000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      maxRedirects: 5,
    });
    console.log(`✅ ${r.status}`, JSON.stringify(r.data).substring(0, 500));
  } catch(e) {
    if (e.response) {
      const err = e.response.headers['x-ca-error-message'] || e.response.headers['x-ca-error-code'] || '(sem msg)';
      console.log(`❌ ${e.response.status} | ${err} | ${JSON.stringify(e.response.data).substring(0, 200)}`);
    } else {
      console.log(`💥 ${e.message}`);
    }
  }
}

async function main() {
  console.log('Testando host: pro-cloud.solplanet.net\n');

  // Endpoints /pro/
  await test('getPlanListPro /pro/', '/api/pro/getPlanListPro', { apikey: APP_KEY, token: TOKEN });
  await test('getPlantOverviewPro /pro/', '/api/pro/getPlantOverviewPro', { apikey: APP_KEY, token: TOKEN });
  await test('getLastTsDataPro /pro/', '/api/pro/getLastTsDataPro', { apikey: APP_KEY, token: TOKEN });

  // Endpoints sem /pro/
  await test('planlist sem /pro/', '/api/planlist', { token: TOKEN });
  await test('devicelist sem /pro/', '/api/devicelist', { token: TOKEN });

  // Sem /api/ prefix
  await test('planlist sem /api/', '/planlist', { token: TOKEN });
  await test('getPlanListPro sem /api/', '/pro/getPlanListPro', { apikey: APP_KEY, token: TOKEN });

  // Só token, sem assinatura (por se a API deles não usar o gateway Alibaba)
  const urlSimples = `${BASE_URL}/api/planlist?token=${TOKEN}`;
  console.log(`\n[GET simples sem assinatura] ${urlSimples}`);
  try {
    const r = await axios.get(urlSimples, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'app 1.0' },
      timeout: 8000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    console.log(`✅ ${r.status}`, JSON.stringify(r.data).substring(0, 500));
  } catch(e) {
    if (e.response) console.log(`❌ ${e.response.status} | ${JSON.stringify(e.response.data).substring(0, 200)}`);
    else console.log(`💥 ${e.message}`);
  }
}

main();
