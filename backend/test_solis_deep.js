const axios = require('axios');
const crypto = require('crypto');

const KEY_ID = '1300386381676729641';
const KEY_SECRET = 'c526acc1c0ec4e57b12f42c3ff922ee8';
const BASE_URL = 'https://www.soliscloud.com:13333';

function buildHeaders(path, bodyObj = {}) {
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

async function req(path, body = {}) {
  const { headers, bodyStr } = buildHeaders(path, body);
  try {
    const res = await axios.post(`${BASE_URL}${path}`, bodyStr, { headers, timeout: 15000 });
    return res.data;
  } catch (e) {
    return { error: e.response?.data || e.message };
  }
}

async function run() {
  console.log('=== 1. userStationList ===');
  const s1 = await req('/v1/api/userStationList', { pageNo: 1, pageSize: 100 });
  console.log(JSON.stringify(s1, null, 2));

  console.log('\n=== 2. stationDetailList ===');
  const s2 = await req('/v1/api/stationDetailList', { pageNo: 1, pageSize: 100 });
  console.log(JSON.stringify(s2, null, 2));

  console.log('\n=== 3. inverterList ===');
  const s3 = await req('/v1/api/inverterList', { pageNo: 1, pageSize: 100 });
  console.log(JSON.stringify(s3, null, 2));

  console.log('\n=== 4. collectorList ===');
  const s4 = await req('/v1/api/collectorList', { pageNo: 1, pageSize: 100 });
  console.log(JSON.stringify(s4, null, 2));
}

run();
