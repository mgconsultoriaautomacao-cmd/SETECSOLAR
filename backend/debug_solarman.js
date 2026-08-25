const axios = require('axios');
const crypto = require('crypto');

async function debugSolarman() {
  const appId = '302407178765198';
  const appSecret = '498bdb2be4a5c9f3a3d22332f28395c7';
  const email = 'setecsolarseg@gmail.com';
  const password = '120687@Eli';
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  const urls = [
    `https://globalapi.solarmanpv.com/account/v1.0/token?appId=${appId}&language=en`,
    `https://api.solarmanpv.com/account/v1.0/token?appId=${appId}&language=en`,
    `https://api.solarmanpv.com/account/v1.0/token?appId=${appId}&language=pt`,
  ];

  for (const url of urls) {
    try {
      console.log('Testing Solarman Token URL:', url);
      const res = await axios.post(url, { appSecret, email, password: passwordHash });
      console.log('Solarman response:', JSON.stringify(res.data));
    } catch (err) {
      console.log('Solarman err status:', err.response ? err.response.status : err.message);
      console.log('Solarman err data:', err.response ? JSON.stringify(err.response.data) : '');
    }
  }
}

debugSolarman();
