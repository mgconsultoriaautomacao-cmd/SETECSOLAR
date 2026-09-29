const axios = require('axios');

async function testGoodWeUS() {
  const account = 'setecsolarseg@gmail.com';
  const pwd = '120687@Eli';

  const tokenHeader = JSON.stringify({
    version: 'v2.1.0',
    client: 'ios',
    language: 'en',
    timestamp: Date.now()
  });

  const targets = [
    'https://us.semsportal.com/api/v2/Common/CrossLogin',
    'https://us.semsportal.com/v2/Common/CrossLogin',
    'https://us.semsportal.com/api/v1/Common/CrossLogin',
    'https://us.semsportal.com/api/PowerStation/GetPowerStationList',
  ];

  for (const t of targets) {
    try {
      const res = await axios.post(t, { account, pwd }, {
        headers: {
          'Content-Type': 'application/json',
          'token': tokenHeader
        },
        timeout: 8000
      });
      console.log(`Target: ${t} =>`, res.data);
      if (res.data && res.data.data && res.data.data.token) {
        console.log('🎉 SUCCESSFUL LOGIN ON US SERVER:', res.data.data);
      }
    } catch (e) {
      console.log(`Target: ${t} => Error: ${e.message}`, e.response?.status, e.response?.data);
    }
  }
}

testGoodWeUS();
