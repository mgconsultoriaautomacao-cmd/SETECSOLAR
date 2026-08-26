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

async function testDetail() {
  const sn = '010AF121A070070';
  const id = '1308675217946945707';

  const endpoints = [
    { name: 'inverterDetail (by SN)', path: '/v1/api/inverterDetail', body: { sn } },
    { name: 'inverterDetail (by id)', path: '/v1/api/inverterDetail', body: { id } },
    { name: 'stationDetail', path: '/v1/api/stationDetail', body: { id: '1298491919448953263' } },
  ];

  for (const ep of endpoints) {
    console.log(`\nCalling: ${ep.name} (${ep.path})`);
    const { headers, bodyStr } = buildSolisHeaders(ep.path, ep.body);
    try {
      const res = await axios.post(`${BASE_URL}${ep.path}`, bodyStr, { headers, timeout: 10000 });
      console.log('Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
      console.error('Error:', e.response?.data || e.message);
    }
  }
}

testDetail();
