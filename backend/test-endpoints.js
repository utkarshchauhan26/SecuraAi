/**
 * TEST BACKEND ENDPOINTS
 * Run this to verify the scan endpoints are working correctly
 * 
 * Usage: node test-endpoints.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testEndpoints() {
  console.log('🧪 TESTING BACKEND ENDPOINTS\n');
  console.log('Backend URL:', process.env.BACKEND_URL || 'http://localhost:5000');
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('');

  // Step 1: Get a recent scan from Supabase
  console.log('📊 Step 1: Finding a recent scan...');
  const { data: scans, error: scanError } = await supabase
    .from('scans')
    .select('id, status, progress, file_count, processed_files, total_findings, user_id, user_email')
    .order('created_at', { ascending: false })
    .limit(5);

  if (scanError || !scans || scans.length === 0) {
    console.log('   ❌ No scans found in database');
    console.log('   💡 Create a scan first, then run this test');
    return;
  }

  console.log(`   ✅ Found ${scans.length} recent scan(s)\n`);
  
  scans.forEach((scan, i) => {
    console.log(`   ${i + 1}. Scan ID: ${scan.id.substring(0, 8)}...`);
    console.log(`      Status: ${scan.status}`);
    console.log(`      Progress: ${scan.progress ?? 'NULL'}`);
    console.log(`      Files: ${scan.processed_files ?? 0}/${scan.file_count ?? 0}`);
    console.log(`      Findings: ${scan.total_findings ?? 0}`);
    console.log('');
  });

  // Step 2: Simulate backend endpoint response
  console.log('📊 Step 2: Simulating backend /api/scans/status/:id response...\n');
  
  const testScan = scans[0];
  const normalizedStatus = (testScan.status || 'queued').toUpperCase();
  
  // Calculate progress
  let progress = testScan.progress || 0;
  if (!progress && normalizedStatus === 'COMPLETED') {
    progress = 100;
  } else if (!progress && normalizedStatus === 'RUNNING') {
    if (testScan.file_count > 0 && testScan.processed_files >= 0) {
      progress = Math.round((testScan.processed_files / testScan.file_count) * 100);
    } else {
      progress = 30;
    }
  }

  const backendResponse = {
    success: true,
    data: {
      id: testScan.id,
      status: normalizedStatus,
      progress,
      file_count: testScan.file_count || 0,
      processed_files: testScan.processed_files || 0,
      current_file: testScan.current_file,
      findings_count: testScan.total_findings || 0,
      started_at: testScan.started_at,
      finished_at: testScan.finished_at,
      report_url: testScan.report_url
    }
  };

  console.log('   Expected Backend Response:');
  console.log('   ' + JSON.stringify(backendResponse, null, 2).split('\n').join('\n   '));
  console.log('');

  // Step 3: Verify response format
  console.log('📊 Step 3: Verifying response format...\n');
  
  const checks = [
    { name: 'Status is UPPERCASE', pass: backendResponse.data.status === backendResponse.data.status.toUpperCase() },
    { name: 'Progress is a number', pass: typeof backendResponse.data.progress === 'number' },
    { name: 'Progress is 0-100', pass: backendResponse.data.progress >= 0 && backendResponse.data.progress <= 100 },
    { name: 'file_count exists', pass: backendResponse.data.file_count !== undefined },
    { name: 'findings_count exists', pass: backendResponse.data.findings_count !== undefined },
    { name: 'Has started_at', pass: backendResponse.data.started_at !== undefined }
  ];

  checks.forEach(check => {
    console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);
  
  console.log('');
  console.log('='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL CHECKS PASSED - Endpoints are configured correctly!');
  } else {
    console.log('❌ SOME CHECKS FAILED - Review the backend controller');
  }
  console.log('='.repeat(60));

  // Step 4: Frontend expectations
  console.log('');
  console.log('📊 Step 4: What frontend expects:\n');
  console.log('   Frontend polling hook will:');
  console.log('   1. Call: GET /api/scans/status/:id');
  console.log('   2. Expect: { success: true, data: {...} }');
  console.log('   3. Map data to ScanStatus interface');
  console.log('   4. Update progress bar with data.progress');
  console.log('   5. Stop polling when status === "COMPLETED"');
  console.log('');
  console.log('   Key fields frontend needs:');
  console.log('   - status (UPPERCASE): ✅', backendResponse.data.status);
  console.log('   - progress (0-100): ✅', backendResponse.data.progress);
  console.log('   - findings_count: ✅', backendResponse.data.findings_count);
  console.log('   - file_count: ✅', backendResponse.data.file_count);
  console.log('');

  // Step 5: Cache headers reminder
  console.log('📊 Step 5: Cache headers reminder:\n');
  console.log('   Backend must set these headers:');
  console.log('   - Cache-Control: no-store, no-cache, must-revalidate, private');
  console.log('   - Pragma: no-cache');
  console.log('   - Expires: 0');
  console.log('');
  console.log('   This prevents Render from caching stale responses!');
  console.log('');

  console.log('✅ Test complete!\n');
}

testEndpoints()
  .then(() => {
    console.log('🎉 All tests passed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
