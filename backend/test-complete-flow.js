const jwt = require('jsonwebtoken');
const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const userId = '3f237129-6b4c-49b3-848d-9f80cbda544a';
const apiUrl = 'http://localhost:5000/api';

// Create JWT token
const token = jwt.sign(
  {
    sub: userId,
    userId: userId,
    email: 'test@example.com',
    name: 'Test User',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
  },
  process.env.NEXTAUTH_SECRET
);

// Helper function to make HTTP requests
function httpRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    };
    
    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testFlow() {
  console.log('🧪 TESTING COMPLETE SCAN FLOW');
  console.log('=' .repeat(60));
  
  // Test 1: Get user scans (check if recent scans show up)
  console.log('\n📋 Test 1: Get Recent Scans');
  console.log('-'.repeat(60));
  try {
    const response = await httpRequest('GET', '/scans/list');
    
    console.log('Status:', response.status);
    if (response.status === 200) {
      const data = response.data;
      console.log('✅ Recent scans:', data.data?.length || 0);
      if (data.data && data.data.length > 0) {
        console.log('\nLatest 5 scans:');
        data.data.slice(0, 5).forEach((scan, i) => {
          console.log(`  ${i + 1}. ${scan.id}`);
          console.log(`     Status: ${scan.status}`);
          console.log(`     Project: ${scan.projectName}`);
          console.log(`     Created: ${scan.createdAt}`);
          console.log(`     Findings: ${scan.totalFindings}`);
        });
      } else {
        console.log('⚠️  No scans found for this user');
      }
    } else {
      console.log('❌ Failed:', JSON.stringify(response.data));
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 2: Check specific scan status
  console.log('\n\n🔍 Test 2: Check Specific Scan Status');
  console.log('-'.repeat(60));
  const testScanId = '228dec65-3a78-4c26-be6a-ea63042378ef';
  try {
    const response = await httpRequest('GET', `/scans/status/${testScanId}`);
    
    console.log('Status:', response.status);
    if (response.status === 200) {
      const data = response.data;
      console.log('✅ Scan found:');
      console.log('   ID:', data.data.id);
      console.log('   Status:', data.data.status);
      console.log('   Project:', data.data.project?.name);
      console.log('   Total Findings:', data.data.totalFindings);
      console.log('   Started:', data.data.startedAt);
      console.log('   Finished:', data.data.finishedAt);
    } else {
      console.log('❌ Failed:', JSON.stringify(response.data));
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 3: Test creating a new scan
  console.log('\n\n🚀 Test 3: Create New Scan (DRY RUN - commented out)');
  console.log('-'.repeat(60));
  console.log('⚠️  Skipping actual scan creation to avoid triggering GitHub Actions');
  console.log('   To test, uncomment the code below and run again');
  
  /*
  try {
    const response = await fetch(`${apiUrl}/scans/repo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        repoUrl: 'https://github.com/your-username/test-repo',
        scanType: 'fast'
      })
    });
    
    console.log('Status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Scan created:', data.data);
    } else {
      const error = await response.text();
      console.log('❌ Failed:', error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  */
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 TEST COMPLETE');
  console.log('='.repeat(60));
}

// Run tests
console.log('🔐 Using JWT for user:', userId);
console.log('🌐 Testing API at:', apiUrl);
console.log('');

testFlow().catch(console.error);