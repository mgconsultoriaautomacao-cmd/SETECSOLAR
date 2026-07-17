require('dotenv').config();
const axios = require('axios');
async function test() {
  const token = process.env.GROWATT_API_TOKEN || "3b4eyuhm081vo6301x18e66l05b9kcjh";
  console.log("Token:", token);
  try {
    const res = await axios.get("https://openapi.growatt.com/v1/plant/list", {
      headers: { 'token': token },
      params: { page: 1, perpage: 10 }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
