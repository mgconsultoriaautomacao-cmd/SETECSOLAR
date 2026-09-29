const axios = require('axios');

async function testGoodWeUser() {
  const account = 'setecsolarseg@gmail.com';
  const pwd = '120687@Eli';

  const baseUrls = [
    'https://www.semsportal.com',
    'https://us-xxzx.semsportal.com',
    'https://eu-xxzx.semsportal.com',
    'https://globalapi.semsportal.com',
    'https://cn.semsportal.com',
    'https://au.semsportal.com'
  ];

  console.log('--- Testing GoodWe CrossLogin for setecsolarseg@gmail.com ---');
  for (const baseUrl of baseUrls) {
    try {
      const tokenHeader = JSON.stringify({
        version: 'v2.1.0',
        client: 'ios',
        language: 'en',
        timestamp: Date.now()
      });

      const res = await axios.post(`${baseUrl}/api/v2/Common/CrossLogin`, { account, pwd }, {
        headers: {
          'Content-Type': 'application/json',
          'token': tokenHeader
        },
        timeout: 8000
      });

      console.log(`URL: ${baseUrl} =>`, res.data);
      if (res.data && res.data.data && res.data.data.token) {
        console.log('🎉 SUCCESSFUL LOGIN:', res.data.data);
      }
    } catch (e) {
      console.log(`URL: ${baseUrl} => Error: ${e.message}`);
    }
  }

  console.log('\n--- Testing GoodWe Login v1 ---');
  for (const baseUrl of baseUrls) {
    try {
      const res = await axios.post(`${baseUrl}/api/v1/Common/Login`, { account, pwd }, {
        headers: {
          'Content-Type': 'application/json',
          'token': JSON.stringify({ version: 'v1.0.0', client: 'ios', language: 'en', timestamp: Date.now() })
        },
        timeout: 8000
      });
      console.log(`V1 URL: ${baseUrl} =>`, res.data);
    } catch (e) {
      console.log(`V1 URL: ${baseUrl} => Error: ${e.message}`);
    }
  }
}

testGoodWeUser();
