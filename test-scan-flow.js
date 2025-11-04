/**
 * LOCAL DIAGNOSTIC SCRIPT
 * Run this to test the entire scan flow locally
 * 
 * Usage: node test-scan-flow.js
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testScanFlow() {
  console.log('🧪 TESTING SCAN FLOW LOCALLY\n');
  
  // Test 1: Check if progress columns exist
  console.log('📊 Test 1: Checking database schema...');
  const { data: columns, error: schemaError } = await supabase
    .rpc('exec_sql', { 
      sql: `SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'scans' 
              AND column_name IN ('progress', 'file_count', 'processed_files', 'current_file')
            ORDER BY column_name` 
    });
  
  if (schemaError) {
    console.log('   ❌ Schema check failed - trying direct query...');
    // Try a simpler check
    const { data: testScan, error: testError } = await supabase
      .from('scans')
      .select('id, status, progress, file_count, processed_files')
      .limit(1)
      .single();
    
    if (testError) {
      console.log('   ❌ Progress columns DO NOT EXIST!');
      console.log('   🔧 ACTION: Run backend/prisma/migrations/02_ADD_PROGRESS_TRACKING.sql in Supabase');
      return;
    } else {
      console.log('   ✅ Progress columns exist (verified by query)');
    }
  } else {
    console.log('   ✅ Schema check passed:', columns?.length || 0, 'columns found');
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
      console.log(`        Progress: ${scan.progress ?? 'NULL'}`);
      console.log(`        File Count: ${scan.file_count ?? 'NULL'}`);
      console.log(`        Processed: ${scan.processed_files ?? 'NULL'}`);
      console.log(`        User: ${scan.user_email}`);
      console.log(`        Created: ${scan.created_at}`);
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
      console.log(`      - ID: ${scan.id.substring(0, 8)}...`);
      console.log(`        Progress: ${scan.progress ?? 'NULL'} (should be 100)`);
      console.log(`        File Count: ${scan.file_count ?? 'NULL'}`);
      console.log(`        Findings: ${scan.total_findings ?? 0}`);
      console.log(`        Duration: ${scan.finished_at ? new Date(scan.finished_at) - new Date(scan.created_at) : 'N/A'}ms`);
    });
  }
  
  // Test 4: Simulate GitHub Actions update
  console.log('\n📊 Test 4: Simulating GitHub Actions progress update...');
  const testScanId = runningScans?.[0]?.id;
  
  if (testScanId) {
    const { data: updated, error: updateError } = await supabase
      .from('scans')
      .update({
        progress: 50,
        file_count: 10,
        processed_files: 5,
        current_file: 'test/example.js'
      })
      .eq('id', testScanId)
      .select()
      .single();
    
    if (updateError) {
      console.log('   ❌ Update failed:', updateError.message);
    } else {
      console.log('   ✅ Successfully updated scan:', {
        id: updated.id.substring(0, 8) + '...',
        progress: updated.progress,
        file_count: updated.file_count,
        processed_files: updated.processed_files
      });
      
      // Verify the update
      const { data: verified, error: verifyError } = await supabase
        .from('scans')
        .select('progress, file_count, processed_files')
        .eq('id', testScanId)
        .single();
      
      if (verified) {
        console.log('   ✅ Verified update:', verified);
      }
    }
  } else {
    console.log('   ⚠️  Skipped - no running scans to test with');
  }
  
  // Test 5: Check reports
  console.log('\n📊 Test 5: Checking reports availability...');
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
        console.log(`      - By Severity:`, severityCounts);
      }
    }
  } else {
    console.log('   ⚠️  No scans to test reports with');
  }
  
  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));
  console.log('1. Database Schema: Check above for progress columns');
  console.log('2. Running Scans: ', runningScans?.length || 0, 'found');
  console.log('3. Completed Scans:', completedScans?.length || 0, 'found');
  console.log('4. Progress Update: Check above for success/failure');
  console.log('5. Reports: Check above for data availability');
  console.log('='.repeat(60));
  
  console.log('\n🔧 NEXT STEPS:');
  console.log('1. If progress columns are missing, run: 02_ADD_PROGRESS_TRACKING.sql');
  console.log('2. Start backend: cd backend && node server.js');
  console.log('3. Start frontend: npm run dev');
  console.log('4. Start a new scan and watch the console');
  console.log('5. Check browser console for: {status, progress, file_count}');
}

testScanFlow()
  .then(() => {
    console.log('\n✅ Diagnostic complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Diagnostic failed:', err);
    process.exit(1);
  });
