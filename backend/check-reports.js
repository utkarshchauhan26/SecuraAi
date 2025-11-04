/**
 * CHECK REPORTS STATUS
 * Run this to see why reports aren't showing
 * 
 * Usage: node check-reports.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkReports() {
  console.log('🔍 CHECKING REPORTS STATUS\n');

  // Get recent scans
  console.log('📊 Fetching recent scans...');
  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select('id, status, total_findings, report_url, created_at, finished_at, user_email, projects(name)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (scansError) {
    console.error('❌ Error fetching scans:', scansError.message);
    return;
  }

  if (!scans || scans.length === 0) {
    console.log('⚠️  No scans found in database');
    return;
  }

  console.log(`✅ Found ${scans.length} scan(s)\n`);
  console.log('='.repeat(80));

  scans.forEach((scan, i) => {
    console.log(`\n${i + 1}. SCAN: ${scan.id.substring(0, 8)}...`);
    console.log(`   Project: ${scan.projects?.name || 'Unknown'}`);
    console.log(`   User: ${scan.user_email}`);
    console.log(`   Status: ${scan.status}`);
    console.log(`   Created: ${new Date(scan.created_at).toLocaleString()}`);
    console.log(`   Finished: ${scan.finished_at ? new Date(scan.finished_at).toLocaleString() : 'N/A'}`);
    console.log(`   Findings: ${scan.total_findings || 0}`);
    
    if (scan.report_url) {
      console.log(`   ✅ Report URL: ${scan.report_url}`);
      console.log(`   📄 Report is available for download!`);
    } else {
      console.log(`   ❌ Report URL: NULL`);
      console.log(`   ⚠️  Report not generated or uploaded yet`);
    }
  });

  console.log('\n' + '='.repeat(80));
  
  // Summary
  const completed = scans.filter(s => s.status === 'completed').length;
  const withReports = scans.filter(s => s.report_url).length;
  
  console.log('\n📊 SUMMARY:');
  console.log(`   Total scans: ${scans.length}`);
  console.log(`   Completed: ${completed}`);
  console.log(`   With reports: ${withReports}`);
  console.log(`   Missing reports: ${completed - withReports}`);
  
  if (withReports === 0) {
    console.log('\n⚠️  NO REPORTS FOUND!');
    console.log('\n🔧 Possible reasons:');
    console.log('   1. GitHub Actions didn\'t generate the PDF');
    console.log('   2. GitHub Actions didn\'t upload to Supabase Storage');
    console.log('   3. GitHub Actions didn\'t update report_url column');
    console.log('   4. Supabase Storage bucket doesn\'t exist');
    console.log('\n💡 Next steps:');
    console.log('   1. Check GitHub Actions workflow logs');
    console.log('   2. Verify Supabase Storage has "reports" bucket');
    console.log('   3. Check if PDF files exist in storage');
    console.log('   4. Manually test PDF generation:');
    console.log('      cd backend');
    console.log('      node -e "require(\'./services/pdf-report.service\').generateScanReport(\'SCAN_ID\', \'USER_ID\')"');
  } else {
    console.log('\n✅ Reports are being generated!');
    console.log('\n💡 To fix missing reports:');
    console.log('   1. Re-run the scans that are missing reports');
    console.log('   2. Or manually generate reports for existing scans');
  }

  // Check Supabase Storage
  console.log('\n📦 Checking Supabase Storage...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.log('❌ Error checking storage:', bucketsError.message);
  } else {
    const reportsBucket = buckets.find(b => b.name === 'reports');
    if (reportsBucket) {
      console.log('✅ "reports" bucket exists');
      
      // Try to list files
      const { data: files, error: filesError } = await supabase.storage
        .from('reports')
        .list('', { limit: 5 });
      
      if (filesError) {
        console.log('❌ Error listing files:', filesError.message);
      } else {
        console.log(`✅ Found ${files.length} file(s) in reports bucket`);
        files.forEach(file => {
          console.log(`   - ${file.name} (${(file.metadata?.size / 1024).toFixed(2)} KB)`);
        });
      }
    } else {
      console.log('❌ "reports" bucket NOT found!');
      console.log('💡 Create it in Supabase dashboard:');
      console.log('   1. Go to Storage in Supabase');
      console.log('   2. Create new bucket named "reports"');
      console.log('   3. Make it public or set RLS policy');
    }
  }

  console.log('\n✅ Check complete!');
}

checkReports()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
