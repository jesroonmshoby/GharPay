const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING GHARPAY BACKEND VERIFICATION ---');

  try {
    const health = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/health',
      method: 'GET',
    });
    console.log('✅ 1. Health check:', health.statusCode, health.body);
  } catch (err) {
    console.error('❌ Backend server error:', err.message);
  }
}

runTests().catch(console.error);
