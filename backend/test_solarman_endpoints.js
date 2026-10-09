const axios = require('axios');
const crypto = require('crypto');

async function testEndpoints() {
  const appId = '302407178765198';
  const appSecret = '498bdb2be4a5c9f3a3d22332f28395c7';
  const email = 'elionaldooliveiraleite2012@gmail.com';
  const sha256Password = crypto.createHash('sha256').update('120687@Eli').digest('hex');

  const tokenRes = await axios.post(
    `https://globalapi.solarmanpv.com/account/v1.0/token?appId=${appId}&language=en`,
    { appSecret, email, password: sha256Password },
    { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
  );

  const token = tokenRes.data.access_token;
  console.log('Access token obtained.');

  const headers = {
    'Authorization': `bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Station list
  const stRes = await axios.post('https://globalapi.solarmanpv.com/station/v1.0/list', { page: 1, size: 50 }, { headers });
  console.log('Station list count:', stRes.data?.stationList?.length);

  // Station realtime for João Batista (id 64614305)
  try {
    const rtRes = await axios.post('https://globalapi.solarmanpv.com/station/v1.0/realTime', { stationId: 64614305 }, { headers });
    console.log('RealTime for 64614305:', rtRes.data);
  } catch (e) {
    console.log('RealTime error:', e.response?.data || e.message);
  }
}

testEndpoints();
