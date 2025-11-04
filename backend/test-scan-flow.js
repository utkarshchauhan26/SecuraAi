/**
 * LOCAL DIAGNOSTIC SCRIPT  
 * Run this to test the entire scan flow locally
 * 
 * Usage: cd backend && node test-scan-flow.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testScanFlow() {
  console.log('🧪 TESTING SCAN FLOW LOCALLY\n');
  
  // Test 1: Check if progress columns exist by trying to query them
  console.log('📊 Test 1: Checking if progress columns exist...');
  const { data: testScan, error: testError } = await supabase
    .from('scans')
    .select('id, status, progress, file_count, processed_files, current_file, elapsed_time, estimated_remaining')
    .limit(1)
    .maybeSingle();
  
  if (testError) {
    console.log('   ❌ Progress columns DO NOT EXIST!');
    console.log('   ❌ Error:', testError.message);
    console.log('   🔧 ACTION: Run backend/prisma/migrations/02_ADD_PROGRESS_TRACKING.sql in Supabase SQL Editor');
    console.log('\n⛔ Cannot continue - please add columns first!\n');
    return;
  } else {
    console.log('   ✅ Progress columns exist! Sample data:');
    if (testScan) {
      console.log('      - progress:', testScan.progress ?? 'NULL');
      console.log('      - file_count:', testScan.file_count ?? 'NULL');
      console.log('      - processed_files:', testScan.processed_files ?? 'NULL');
    }
  }
  
  // Test 2: Get recent running scan
  console.log('\n📊 Test 2: Checking recent RUNNING scans...');
  const { data: runningScans, error: runningError } = await supabase
    .from('scans')
    .select('id, status, progress, file_count, processed_files, user_email, created_at')
    .eq('status', 'running')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (runningError) {
    console.log('   ❌ Error fetching running scans:', runningError.message);
  } else if (!runningScans || runningScans.length === 0) {
    console.log('   ⚠️  No running scans found');
  } else {
    console.log(`   ✅ Found ${runningScans.length} running scan(s):`);
    runningScans.forEach(scan => {
      console.log(`      - ID: ${scan.id.substring(0, 8)}...`);
      console.log(`        Status: ${scan.status}`);
      console.log(`        Progress: ${scan.progress ?? 'NULL'} (should be 10 or more)`);
      console.log(`        File Count: ${scan.file_count ?? 'NULL'}`);
      console.log(`        Processed: ${scan.processed_files ?? 'NULL'}`);
      console.log(`        User: ${scan.user_email}`);
    });
  }
  
  // Test 3: Get recent completed scans
  console.log('\n📊 Test 3: Checking recent COMPLETED scans...');
  const { data: completedScans, error: completedError } = await supabase
    .from('scans')
    .select('id, status, progress, file_count, total_findings, user_email, created_at, finished_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (completedError) {
    console.log('   ❌ Error fetching completed scans:', completedError.message);
  } else if (!completedScans || completedScans.length === 0) {
    console.log('   ⚠️  No completed scans found');
  } else {
    console.log(`   ✅ Found ${completedScans.length} completed scan(s):`);
    completedScans.forEach(scan => {
      const duration = scan.finished_at && scan.created_at 
        ? Math.round((new Date(scan.finished_at) - new Date(scan.created_at)) / 1000)
        : null;
      console.log(`      - ID: ${scan.id.substring(0, 8)}...`);
      console.log(`        Progress: ${scan.progress ?? 'NULL'} (should be 100)`);
      console.log(`        File Count: ${scan.file_count ?? 'NULL'}`);
      console.log(`        Findings: ${scan.total_findings ?? 0}`);
      console.log(`        Duration: ${duration ? duration + 's' : 'N/A'}`);
    });
  }
  
  // Test 4: Check a specific scan for reports
  console.log('\n📊 Test 4: Checking reports availability...');
  const recentScanId = completedScans?.[0]?.id || runningScans?.[0]?.id;
  
  if (recentScanId) {
    const { data: reportData, error: reportError } = await supabase
      .from('scans')
      .select(`
        id,
        status,
        total_findings,
        project:projects(id, name),
        findings(id, severity, title)
      `)
      .eq('id', recentScanId)
      .single();
    
    if (reportError) {
      console.log('   ❌ Report query failed:', reportError.message);
    } else {
      console.log('   ✅ Report data accessible:');
      console.log(`      - Scan ID: ${reportData.id.substring(0, 8)}...`);
      console.log(`      - Project: ${reportData.project?.name || 'Unknown'}`);
      console.log(`      - Total Findings: ${reportData.total_findings || 0}`);
      console.log(`      - Findings in DB: ${reportData.findings?.length || 0}`);
      
      if (reportData.findings && reportData.findings.length > 0) {
        const severityCounts = reportData.findings.reduce((acc, f) => {
          acc[f.severity] = (acc[f.severity] || 0) + 1;
          return acc;
        }, {});
        console.log(`      - By Severity:`, JSON.stringify(severityCounts));
      } else if (reportData.total_findings > 0) {
        console.log('      ⚠️  total_findings shows', reportData.total_findings, 'but findings array is empty!');
      }
    }
  } else {
    console.log('   ⚠️  No scans to test reports with');
  }
  
  // Final Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(70));
  console.log('✅ Progress columns:', testError ? 'MISSING' : 'EXIST');
  console.log('📊 Running scans:', runningScans?.length || 0);
  console.log('✅ Completed scans:', completedScans?.length || 0);
  console.log('📄 Reports accessible:', recentScanId ? 'YES' : 'NO SCANS');
  console.log('='.repeat(70));
  
  // Actionable next steps
  console.log('\n🎯 WHAT TO DO NEXT:');
  
  if (runningScans && runningScans.length > 0) {
    const hasProgress = runningScans.some(s => s.progress !== null);
    if (!hasProgress) {
      console.log('⚠️  Running scans have NULL progress - they were created before migration');
      console.log('   → Wait for them to finish or mark as failed');
    } else {
      console.log('✅ Running scans have progress data - looking good!');
    }
  }
  
  if (completedScans && completedScans.length > 0) {
    const hasProgress = completedScans.some(s => s.progress === 100);
    if (!hasProgress) {
      console.log('⚠️  Completed scans don\'t have progress=100');
      console.log('   → Start a NEW scan to test the complete flow');
    } else {
      console.log('✅ Completed scans have progress=100 - perfect!');
    }
  }
  
  console.log('\n🚀 TO TEST LOCALLY:');
  console.log('1. Terminal 1: cd backend && node server.js');
  console.log('2. Terminal 2: npm run dev');  
  console.log('3. Browser: http://localhost:3000');
  console.log('4. Start a scan and watch console for progress updates');
  console.log('5. Progress should show: 0 → 10 → 100');
}

testScanFlow()
  .then(() => {
    console.log('\n✅ Diagnostic complete!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Diagnostic failed:', err.message);
    console.error(err);
    process.exit(1);
  });
