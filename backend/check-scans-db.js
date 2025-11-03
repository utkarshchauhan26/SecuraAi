require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkScans() {
  console.log('🔍 Checking recent scans in database...\n');
  
  // Get recent scans
  const { data: scans, error: scanError } = await supabase
    .from('scans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (scanError) {
    console.error('❌ Error fetching scans:', scanError);
    return;
  }
  
  console.log(`Found ${scans.length} recent scans:\n`);
  
  for (const scan of scans) {
    console.log(`📊 Scan ID: ${scan.id}`);
    console.log(`   Status: ${scan.status}`);
    console.log(`   Created: ${scan.created_at}`);
    console.log(`   Started: ${scan.started_at || 'N/A'}`);
    console.log(`   Finished: ${scan.finished_at || 'N/A'}`);
    console.log(`   Findings: ${scan.total_findings || 0}`);
    console.log(`   Error: ${scan.error_message || 'None'}`);
    
    // Check if this scan has findings
    if (scan.id) {
      const { data: findings, error: findError } = await supabase
        .from('findings')
        .select('id')
        .eq('scan_id', scan.id);
      
      if (!findError) {
        console.log(`   Findings in DB: ${findings.length}`);
      }
    }
    console.log('');
  }
}

checkScans().catch(console.error);
