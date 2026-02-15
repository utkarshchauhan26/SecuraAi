/**
 * Add files_scanned column to scans table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addFilesScannedColumn() {
  console.log('🔧 Adding files_scanned column to scans table...\n');
  
  try {
    // Use the Supabase client to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE scans ADD COLUMN IF NOT EXISTS files_scanned INTEGER DEFAULT 0;'
    });
    
    if (error) {
      console.log('❌ Error adding column:', error.message);
      console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
      console.log('   ALTER TABLE scans ADD COLUMN IF NOT EXISTS files_scanned INTEGER DEFAULT 0;\n');
    } else {
      console.log('✅ Successfully added files_scanned column!\n');
    }
    
    // Try to verify by querying the scans table
    const { data: scans, error: queryError } = await supabase
      .from('scans')
      .select('id, status, files_scanned, file_count')
      .limit(1);
    
    if (!queryError) {
      console.log('✅ Column verified - can query files_scanned');
      if (scans && scans.length > 0) {
        console.log('   Sample:', scans[0]);
      }
    } else {
      console.log('⚠️  Column may not exist yet:', queryError.message);
      console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
      console.log('   ALTER TABLE scans ADD COLUMN IF NOT EXISTS files_scanned INTEGER DEFAULT 0;\n');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log('   ALTER TABLE scans ADD COLUMN IF NOT EXISTS files_scanned INTEGER DEFAULT 0;\n');
  }
}

addFilesScannedColumn();
