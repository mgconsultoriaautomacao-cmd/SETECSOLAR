const axios = require('axios');
const crypto = require('crypto');

async function testSolarmanPlants() {
  const appId = '302407178765198';
  const appSecret = '498bdb2be4a5c9f3a3d22332f28395c7';
  const email = 'elionaldooliveiraleite2012@gmail.com';
  const rawPassword = '120687@Eli';
  const sha256Password = crypto.createHash('sha256').update(rawPassword).digest('hex');

  const tokenRes = await axios.post(
    `https://globalapi.solarmanpv.com/account/v1.0/token?appId=${appId}&language=en`,
    { appSecret, email, password: sha256Password },
    { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
  );

  const token = tokenRes.data.access_token;
  console.log('Token obtained:', !!token);

  console.log('\n--- 1. Station List ---');
  try {
    const stationRes = await axios.post(
      'https://globalapi.solarmanpv.com/station/v1.0/list',
      { page: 1, size: 50 },
      { headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    console.log('Stations:', JSON.stringify(stationRes.data, null, 2));
  } catch (e) {
    console.log('Station error:', e.response?.data || e.message);
  }

  console.log('\n--- 2. Device List ---');
  try {
    const devRes = await axios.post(
      'https://globalapi.solarmanpv.com/device/v1.0/list',
      { page: 1, size: 50 },
      { headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    console.log('Devices:', JSON.stringify(devRes.data, null, 2));
  } catch (e) {
    console.log('Device error:', e.response?.data || e.message);
  }
}

testSolarmanPlants();
