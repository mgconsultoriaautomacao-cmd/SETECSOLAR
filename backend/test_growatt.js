const axios = require('axios');

async function testGrowatt() {
  const token = '7t7ts5jz723e1ah3yn684m7ce03d7087';
  const devices = ['EHH0CL5029', 'PKEGCJJ06E', 'PKEGCJJ06F'];
  
  for (const sn of devices) {
    console.log(`\nTesting Growatt SN: ${sn}`);
    try {
      const res = await axios.get('https://openapi.growatt.com/v1/device/inverter/last_new_data', {
        headers: { token, 'Content-Type': 'application/x-www-form-urlencoded' },
        params: { device_sn: sn },
        timeout: 10000
      });
      console.log('Result:', JSON.stringify(res.data, null, 2));
    } catch (e) {
      console.error('Error:', e.response?.data || e.message);
    }
  }
}

testGrowatt();
