/**
 * Test routes accessibility on Render
 * This script verifies all API routes are properly mounted
 */

const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';

const routesToTest = [
  { path: '/health', method: 'GET', requiresAuth: false },
  { path: '/api/health', method: 'GET', requiresAuth: false },
  { path: '/api/scans/list', method: 'GET', requiresAuth: true },
  { path: '/api/reports/list', method: 'GET', requiresAuth: true },
];

async function testRoute(route) {
  const url = `${baseUrl}${route.path}`;
  
  try {
    const headers = {};
    if (route.requiresAuth) {
      // Add a dummy token for testing (will fail auth but verify route exists)
      headers['Authorization'] = 'Bearer dummy-token-for-route-test';
    }

    const response = await fetch(url, {
      method: route.method,
      headers
    });

    const expectedStatus = route.requiresAuth ? 401 : 200; // 401 means route exists but auth failed
    const actualStatus = response.status;

    if (actualStatus === expectedStatus || actualStatus === 200) {
      console.log(`✅ ${route.method} ${route.path} - Route exists (${actualStatus})`);
      return true;
    } else if (actualStatus === 404) {
      console.log(`❌ ${route.method} ${route.path} - Route NOT FOUND (404)`);
      return false;
    } else {
      console.log(`⚠️  ${route.method} ${route.path} - Unexpected status (${actualStatus})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${route.method} ${route.path} - Error: ${error.message}`);
    return false;
  }
}

async function testAllRoutes() {
  console.log('🧪 Testing API Routes on:', baseUrl);
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const route of routesToTest) {
    const success = await testRoute(route);
    results.push({ route: route.path, success });
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📊 Summary:');
  console.log('  ✅ Passed:', results.filter(r => r.success).length);
  console.log('  ❌ Failed:', results.filter(r => !r.success).length);
  
  if (results.every(r => r.success)) {
    console.log('\n🎉 All routes are properly mounted!');
  } else {
    console.log('\n⚠️  Some routes are not accessible');
    console.log('   Check backend/routes/index.js and server.js');
  }
}

testAllRoutes();
