// Quick test to check backend API
const http = require('http');

function test(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ GET ${path}: ${res.statusCode}`);
        try {
          console.log(JSON.parse(data));
        } catch (e) {
          console.log(data);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.log(`❌ GET ${path}: ${err.message}`);
      resolve();
    });
  });
}

async function run() {
  console.log('Testing Backend API...\n');
  await test('/health');
  await test('/api/health');
}

run();