const axios = require('axios');
const crypto = require('crypto');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

async function testSolarman() {
  console.log('=== 1. TESTANDO SOLARMAN CLOUD API ===');
  const appId = '302407178765198';
  const appSecret = '498bdb2be4a5c9f3a3d22332f28395c7';
  const email = 'setecsolarseg@gmail.com';
  const password = '120687@Eli';
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  try {
    const tokenUrl = `https://globalapi.solarmanpv.com/account/v1.0/token?appId=${appId}&language=en`;
    const tokenRes = await axios.post(tokenUrl, { appSecret, email, password: passwordHash });
    console.log('Solarman Token OK:', tokenRes.data.access_token ? 'SIM' : 'NÃO');
    const token = tokenRes.data.access_token;

    if (token) {
      // 1. Lista de usinas / estações
      const stationRes = await axios.post(
        'https://globalapi.solarmanpv.com/station/v1.0/list',
        { page: 1, size: 50 },
        { headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('Solarman Estações:', JSON.stringify(stationRes.data, null, 2));

      // 2. Lista de dispositivos
      const deviceRes = await axios.post(
        'https://globalapi.solarmanpv.com/device/v1.0/list',
        { page: 1, size: 50 },
        { headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('Solarman Dispositivos:', JSON.stringify(deviceRes.data, null, 2));
    }
  } catch (err) {
    console.log('Solarman Erro:', err.response ? JSON.stringify(err.response.data) : err.message);
  }
}

async function testSolplanet() {
  console.log('\n=== 2. TESTANDO SOLPLANET / AISWEI API ===');
  
  // Vamos testar todas as variações de chaves e parâmetros possíveis
  const combinations = [
    { key: '205024856', secret: 'QT3qSt0ntxTI8JminCull8p2066zCDnZ', desc: 'appKey=205024856, appSecret=QT3q...' },
    { key: 'CPVYA', secret: 'QT3qSt0ntxTI8JminCull8p2066zCDnZ', desc: 'appKey=CPVYA, appSecret=QT3q...' },
    { key: '205024856', secret: '120687@Eli', desc: 'appKey=205024856, appSecret=senha' },
    { key: 'QT3qSt0ntxTI8JminCull8p2066zCDnZ', secret: '205024856', desc: 'appKey=QT3q..., appSecret=205024856' },
  ];

  const hosts = [
    'https://eu-api-genergal.aisweicloud.com',
    'https://api.general.aisweicloud.com'
  ];

  for (const comb of combinations) {
    console.log(`\n--- Testando ${comb.desc} ---`);
    for (const host of hosts) {
      const endpoints = [
        '/pro/getPlanListPro?apikey=QT3qSt0ntxTI8JminCull8p2066zCDnZ',
        '/pro/getPlanListPro?apikey=' + comb.key,
        '/pro/getPlanListPro',
      ];

      for (const ep of endpoints) {
        const stringToSign = `GET\napplication/json\n\napplication/json; charset=UTF-8\nX-Ca-Key:${comb.key}\n${ep}`;
        const signature = crypto.createHmac('sha256', comb.secret).update(stringToSign).digest('base64');
        const headers = {
          'User-Agent': 'SETEC-Energia/1.0',
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept': 'application/json',
          'X-Ca-Signature-Headers': 'X-Ca-Key',
          'X-Ca-Key': comb.key,
          'X-Ca-Signature': signature,
        };

        try {
          const res = await axios.get(`${host}${ep}`, { headers, httpsAgent: agent, timeout: 6000 });
          console.log(`✅ SUCESSO em ${host}${ep}:`, res.status, JSON.stringify(res.data));
        } catch (err) {
          const caMsg = err.response?.headers?.['x-ca-error-message'] || '';
          const caCode = err.response?.headers?.['x-ca-error-code'] || '';
          console.log(`❌ FALHA ${host}${ep} -> status: ${err.response?.status || err.message} | X-Ca-Error: ${caCode} ${caMsg} | data:`, err.response?.data || '');
        }
      }
    }
  }
}

async function run() {
  await testSolarman();
  await testSolplanet();
}

run();
