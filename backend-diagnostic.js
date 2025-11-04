/**
 * BACKEND DIAGNOSTIC SCRIPT
 * Run this to diagnose backend-database communication issues
 * 
 * Usage: node backend-diagnostic.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDiagnostics() {
  console.log('🔍 BACKEND-DATABASE DIAGNOSTIC');
  console.log('=' .repeat(60));
  
  // Test 1: Check connection
  console.log('\n📡 Test 1: Database Connection');
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
    } else {
      console.log('✅ Connection successful');
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message);
  }

  // Test 2: Check scans table structure
  console.log('\n📋 Test 2: Scans Table Structure');
  try {
    const { data: scan, error } = await supabase
      .from('scans')
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.log('❌ Error:', error.message);
    } else if (scan) {
      console.log('✅ Scans table accessible');
      console.log('Columns:', Object.keys(scan));
      console.log('Has user_email?', 'user_email' in scan ? '✅' : '❌');
    } else {
      console.log('⚠️  No scans found in database');
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Test 3: Check recent scans
  console.log('\n🔎 Test 3: Recent Scans');
  try {
    const { data: scans, error } = await supabase
      .from('scans')
      .select('id, user_id, user_email, status, total_findings, created_at, started_at, finished_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log(`✅ Found ${scans.length} recent scans`);
      scans.forEach((scan, idx) => {
        console.log(`\nScan ${idx + 1}:`);
        console.log('  ID:', scan.id);
        console.log('  User ID:', scan.user_id);
        console.log('  User Email:', scan.user_email || '❌ NULL');
        console.log('  Status:', scan.status);
        console.log('  Total Findings:', scan.total_findings);
        console.log('  Created:', scan.created_at);
        console.log('  Started:', scan.started_at);
        console.log('  Finished:', scan.finished_at || 'Not finished');
      });
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Test 4: Check stuck scans
  console.log('\n⏱️  Test 4: Stuck Scans (queued/running > 10 min)');
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: stuckScans, error } = await supabase
      .from('scans')
      .select('id, status, started_at, total_findings')
      .in('status', ['queued', 'running'])
      .lt('started_at', tenMinutesAgo);
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      if (stuckScans.length > 0) {
        console.log(`⚠️  Found ${stuckScans.length} stuck scans:`);
        stuckScans.forEach(scan => {
          console.log(`  - ${scan.id}: ${scan.status} (started: ${scan.started_at})`);
        });
      } else {
        console.log('✅ No stuck scans');
      }
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Test 5: Check findings count mismatch
  console.log('\n🔢 Test 5: Findings Count Verification');
  try {
    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select('id, status, total_findings')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (scansError) {
      console.log('❌ Error:', scansError.message);
    } else {
      for (const scan of scans) {
        const { data: findings, error: findingsError } = await supabase
          .from('findings')
          .select('id', { count: 'exact', head: true })
          .eq('scan_id', scan.id);
        
        const actualCount = findings?.length || 0;
        const recordedCount = scan.total_findings || 0;
        const match = actualCount === recordedCount;
        
        console.log(`\nScan ${scan.id}:`);
        console.log(`  Status: ${scan.status}`);
        console.log(`  Recorded findings: ${recordedCount}`);
        console.log(`  Actual findings: ${actualCount}`);
        console.log(`  Match: ${match ? '✅' : '❌ MISMATCH!'}`);
      }
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Test 6: Check RLS status
  console.log('\n🔐 Test 6: Row Level Security Status');
  try {
    const { data, error } = await supabase.rpc('check_rls_status');
    
    if (error) {
      console.log('⚠️  Cannot check RLS (function may not exist)');
      console.log('   This is OK if using service key');
    } else {
      console.log('RLS Status:', data);
    }
  } catch (err) {
    console.log('⚠️  Cannot check RLS status programmatically');
  }

  // Test 7: Test scan query with user filter
  console.log('\n👤 Test 7: User-Filtered Scan Query');
  const testUserId = '3f237129-6b4c-49b3-848d-9f80cbda544a'; // Replace with actual user ID
  try {
    const { data: userScans, error } = await supabase
      .from('scans')
      .select('id, status, user_id, user_email')
      .eq('user_id', testUserId)
      .limit(5);
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log(`✅ Found ${userScans.length} scans for user ${testUserId}`);
      userScans.forEach(scan => {
        console.log(`  - ${scan.id}: ${scan.status} (email: ${scan.user_email || 'NULL'})`);
      });
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Test 8: Check foreign key relationships
  console.log('\n🔗 Test 8: Foreign Key Relationships');
  try {
    const { data: scansWithProjects, error } = await supabase
      .from('scans')
      .select('id, status, project_id, projects(id, name, repo_url)')
      .limit(3);
    
    if (error) {
      console.log('❌ Error:', error.message);
      console.log('   This might indicate a foreign key issue');
    } else {
      console.log('✅ Foreign key relationships working');
      scansWithProjects.forEach(scan => {
        console.log(`  Scan ${scan.id}:`);
        console.log(`    Project: ${scan.projects?.name || 'NULL (ORPHANED!)'}`);
      });
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('=' .repeat(60));
  console.log('\nIf you see any ❌ or ⚠️  above, those are potential issues.');
  console.log('\nCommon issues:');
  console.log('1. ❌ user_email column missing → Run migration SQL');
  console.log('2. ❌ Findings count mismatch → Data consistency issue');
  console.log('3. ❌ Stuck scans → GitHub Actions may have failed');
  console.log('4. ❌ Foreign key errors → Run diagnostic SQL to fix');
  console.log('5. ❌ RLS blocking queries → Disable RLS or check policies');
}

runDiagnostics().catch(console.error);
