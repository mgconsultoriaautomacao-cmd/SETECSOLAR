const axios = require('axios');
const crypto = require('crypto');

const KEY_ID = '1300386381676729641';
const KEY_SECRET = 'c526acc1c0ec4e57b12f42c3ff922ee8';
const BASE_URL = 'https://www.soliscloud.com:13333';

function buildSolisHeaders(path, bodyObj = {}) {
  const bodyStr = JSON.stringify(bodyObj);
  const contentMd5 = crypto.createHash('md5').update(bodyStr, 'utf8').digest('base64');
  const dateStr = new Date().toUTCString();
  const contentType = 'application/json';

  // Format: "POST\n[Content-MD5]\napplication/json\n[Date]\n[CanonicalResource]"
  const stringToSign = `POST\n${contentMd5}\n${contentType}\n${dateStr}\n${path}`;
  const signature = crypto.createHmac('sha1', KEY_SECRET).update(stringToSign, 'utf8').digest('base64');

  return {
    headers: {
      'Content-Type': contentType,
      'Content-MD5': contentMd5,
      'Date': dateStr,
      'Authorization': `API ${KEY_ID}:${signature}`,
    },
    bodyStr
  };
}

async function testSolis() {
  console.log('Testing SolisCloud API with KeyID:', KEY_ID);

  const endpoints = [
    { name: 'userStationList', path: '/v1/api/userStationList', body: { pageNo: 1, pageSize: 20 } },
    { name: 'stationDetailList', path: '/v1/api/stationDetailList', body: { pageNo: 1, pageSize: 20 } },
    { name: 'inverterList', path: '/v1/api/inverterList', body: { pageNo: 1, pageSize: 20 } },
    { name: 'collectorList', path: '/v1/api/collectorList', body: { pageNo: 1, pageSize: 20 } },
  ];

  for (const ep of endpoints) {
    console.log(`\n---------------------------------------`);
    console.log(`Calling: ${ep.name} (${ep.path})`);
    const { headers, bodyStr } = buildSolisHeaders(ep.path, ep.body);
    try {
      const res = await axios.post(`${BASE_URL}${ep.path}`, bodyStr, {
        headers,
        timeout: 12000
      });
      console.log('HTTP Status:', res.status);
      console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
      console.error('Error:', e.response?.status, e.response?.data || e.message);
    }
  }
}

testSolis();
