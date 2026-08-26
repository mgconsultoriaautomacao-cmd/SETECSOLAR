const axios = require('axios');
const crypto = require('crypto');

async function testSolarman() {
  const appId = '302407178765198';
  const appSecret = '498bdb2be4a5c9f3a3d22332f28395c7';
  const email = 'setecsolarseg@gmail.com';
  const rawPassword = '120687@Eli';
  const sha256Password = crypto.createHash('sha256').update(rawPassword).digest('hex');
  const md5Password = crypto.createHash('md5').update(rawPassword).digest('hex');

  const hosts = [
    'https://globalapi.solarmanpv.com',
    'https://api.solarmanpv.com',
    'https://business-api.solarmanpv.com',
  ];

  const variants = [
    { label: 'SHA256 password with email', body: { appSecret, email, password: sha256Password } },
    { label: 'SHA256 password with username', body: { appSecret, username: email, password: sha256Password } },
    { label: 'Raw password with email', body: { appSecret, email, password: rawPassword } },
    { label: 'Raw password with username', body: { appSecret, username: email, password: rawPassword } },
    { label: 'MD5 password with email', body: { appSecret, email, password: md5Password } },
  ];

  for (const host of hosts) {
    console.log(`\nTesting Host: ${host}`);
    for (const v of variants) {
      const url = `${host}/account/v1.0/token?appId=${appId}&language=en`;
      try {
        const res = await axios.post(url, v.body, { timeout: 8000, headers: { 'Content-Type': 'application/json' } });
        console.log(`  [${v.label}] Status: ${res.status}, Success: ${res.data.success}, Code: ${res.data.code}, Msg: ${res.data.msg}`);
        if (res.data.access_token) {
          console.log(`  🎉 TOKEN RECEBIDO: ${res.data.access_token.substring(0, 20)}...`);
        }
      } catch (e) {
        console.log(`  [${v.label}] Falhou: ${e.response?.status || e.message} -> ${JSON.stringify(e.response?.data)}`);
      }
    }
  }
}

testSolarman();
