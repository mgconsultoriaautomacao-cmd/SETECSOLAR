const axios = require('axios');
const crypto = require('crypto');

async function testSolarmanAuth() {
  const appId = '302407178765198';
  const appSecret = '498bdb2be4a5c9f3a3d22332f28395c7';
  const email = 'elionaldooliveiraleite2012@gmail.com';
  const rawPassword = '120687@Eli';
  const sha256Password = crypto.createHash('sha256').update(rawPassword).digest('hex');

  console.log('Testing Solarman Token with raw password:');
  try {
    const res1 = await axios.post(
      `https://globalapi.solarmanpv.com/account/v1.0/token?appId=${appId}&language=en`,
      { appSecret, email, password: rawPassword },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    console.log('Raw pwd result:', res1.data);
  } catch (e) {
    console.log('Raw pwd error:', e.response?.data || e.message);
  }

  console.log('\nTesting Solarman Token with sha256 password:');
  try {
    const res2 = await axios.post(
      `https://globalapi.solarmanpv.com/account/v1.0/token?appId=${appId}&language=en`,
      { appSecret, email, password: sha256Password },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    console.log('SHA256 pwd result:', res2.data);
  } catch (e) {
    console.log('SHA256 pwd error:', e.response?.data || e.message);
  }
}

testSolarmanAuth();
