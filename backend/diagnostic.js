/**
 * BACKEND DIAGNOSTIC SCRIPT
 * Run this to diagnose backend-database communication issues
 * 
 * Usage: cd backend && node diagnostic.js
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
  console.log('\n🔎 Test 3: Recent Scans (Top 5)');
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
        console.log('  ID:', scan.id.substring(0, 8) + '...');
        console.log('  User ID:', scan.user_id.substring(0, 8) + '...');
        console.log('  User Email:', scan.user_email || '❌ NULL');
        console.log('  Status:', scan.status);
        console.log('  Total Findings:', scan.total_findings);
        console.log('  Created:', new Date(scan.created_at).toLocaleString());
        console.log('  Finished:', scan.finished_at ? new Date(scan.finished_at).toLocaleString() : 'Not finished');
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
          console.log(`  - ${scan.id.substring(0, 8)}...: ${scan.status} (started: ${new Date(scan.started_at).toLocaleString()})`);
        });
      } else {
        console.log('✅ No stuck scans');
      }
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Test 5: Check findings count mismatch
  console.log('\n🔢 Test 5: Findings Count Verification (Top 5 scans)');
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
        const { count, error: findingsError } = await supabase
          .from('findings')
          .select('*', { count: 'exact', head: true })
          .eq('scan_id', scan.id);
        
        const actualCount = count || 0;
        const recordedCount = scan.total_findings || 0;
        const match = actualCount === recordedCount;
        
        console.log(`\nScan ${scan.id.substring(0, 8)}...:`);
        console.log(`  Status: ${scan.status}`);
        console.log(`  Recorded findings: ${recordedCount}`);
        console.log(`  Actual findings: ${actualCount}`);
        console.log(`  Match: ${match ? '✅' : '❌ MISMATCH!'}`);
      }
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Test 6: Check foreign key relationships
  console.log('\n🔗 Test 6: Foreign Key Relationships (Top 3 scans)');
  try {
    const { data: scansWithProjects, error } = await supabase
      .from('scans')
      .select('id, status, project_id, projects(id, name, repo_url)')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.log('❌ Error:', error.message);
      console.log('   This might indicate a foreign key issue');
    } else {
      console.log('✅ Foreign key relationships working');
      scansWithProjects.forEach(scan => {
        console.log(`  Scan ${scan.id.substring(0, 8)}...:`);
        console.log(`    Project: ${scan.projects?.name || 'NULL (ORPHANED!)'}`);
        console.log(`    Repo: ${scan.projects?.repo_url || 'N/A'}`);
      });
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Test 7: Summary Stats
  console.log('\n📊 Test 7: Database Statistics');
  try {
    const { count: totalScans } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true });
    
    const { count: completedScans } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    
    const { count: scansWithEmail } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .not('user_email', 'is', null);
    
    const { count: totalFindings } = await supabase
      .from('findings')
      .select('*', { count: 'exact', head: true });
    
    console.log('✅ Statistics:');
    console.log(`  Total Scans: ${totalScans}`);
    console.log(`  Completed Scans: ${completedScans}`);
    console.log(`  Scans with Email: ${scansWithEmail} / ${totalScans}`);
    console.log(`  Total Findings: ${totalFindings}`);
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('=' .repeat(60));
  console.log('\n✅ All tests completed!');
  console.log('\nIf you see any ❌ above, those are issues that need fixing.');
  console.log('\nCommon issues:');
  console.log('1. ❌ user_email column missing → Already fixed by SQL migration');
  console.log('2. ❌ Findings count mismatch → Data consistency issue');
  console.log('3. ❌ Stuck scans → May need manual cleanup');
  console.log('4. ❌ Foreign key errors → Check relationships');
  console.log('5. ❌ Connection errors → Check environment variables');
  console.log('\n✅ If all tests show ✅, database is working correctly!');
}

runDiagnostics().catch(console.error);
