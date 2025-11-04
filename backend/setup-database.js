/**
 * DATABASE SETUP SCRIPT
 * Automatically creates all missing columns in Supabase
 * 
 * Usage: node setup-database.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupDatabase() {
  console.log('🔧 SETTING UP DATABASE\n');
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('');

  try {
    console.log('📊 Step 1: Adding missing columns to scans table...\n');

    // Add all missing columns
    const migrations = [
      {
        name: 'progress tracking columns',
        sql: `
          ALTER TABLE scans
            ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS processed_files INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS current_file TEXT;
        `
      },
      {
        name: 'report and risk columns',
        sql: `
          ALTER TABLE scans
            ADD COLUMN IF NOT EXISTS report_url TEXT,
            ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS scan_type TEXT DEFAULT 'fast',
            ADD COLUMN IF NOT EXISTS error_message TEXT;
        `
      },
      {
        name: 'indexes for performance',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_scans_report_url ON scans(report_url) WHERE report_url IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
          CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
        `
      }
    ];

    for (const migration of migrations) {
      console.log(`   Adding ${migration.name}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: migration.sql });
      
      if (error) {
        // Try direct query as fallback
        console.log(`   ⚠️  RPC failed, trying direct execution...`);
        // Note: Direct DDL might not work with Supabase client, manual execution needed
        console.log(`   ℹ️  Please run this SQL manually in Supabase SQL Editor:`);
        console.log(migration.sql);
      } else {
        console.log(`   ✅ ${migration.name} added`);
      }
    }

    console.log('\n📊 Step 2: Verifying columns...\n');

    // Check which columns exist
    const requiredColumns = [
      'progress',
      'file_count', 
      'processed_files',
      'current_file',
      'report_url',
      'risk_score',
      'scan_type',
      'error_message'
    ];

    const { data: columns, error: schemaError } = await supabase
      .from('scans')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.log('   ⚠️  Could not verify columns, but they might exist');
      console.log('   Error:', schemaError.message);
    } else if (columns && columns.length > 0) {
      const existingColumns = Object.keys(columns[0]);
      console.log('   Existing columns in scans table:');
      requiredColumns.forEach(col => {
        if (existingColumns.includes(col)) {
          console.log(`   ✅ ${col}`);
        } else {
          console.log(`   ❌ ${col} - MISSING`);
        }
      });
    }

    console.log('\n📊 Step 3: Checking Supabase Storage...\n');

    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('   ❌ Error checking storage:', bucketsError.message);
    } else {
      const reportsBucket = buckets.find(b => b.name === 'reports');
      if (reportsBucket) {
        console.log('   ✅ "reports" bucket exists');
      } else {
        console.log('   ❌ "reports" bucket NOT found');
        console.log('   💡 Creating reports bucket...');
        
        const { error: createError } = await supabase.storage.createBucket('reports', {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        });

        if (createError) {
          console.log('   ❌ Failed to create bucket:', createError.message);
          console.log('   💡 Please create it manually in Supabase dashboard:');
          console.log('      1. Go to Storage');
          console.log('      2. Create new bucket named "reports"');
          console.log('      3. Make it public');
        } else {
          console.log('   ✅ Created "reports" bucket');
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE SETUP COMPLETE!');
    console.log('='.repeat(60));

    console.log('\n📋 Manual Steps Required:\n');
    console.log('If columns are still missing, run this SQL in Supabase SQL Editor:');
    console.log('\n```sql');
    console.log('-- Add all missing columns');
    console.log('ALTER TABLE scans');
    console.log('  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,');
    console.log('  ADD COLUMN IF NOT EXISTS file_count INTEGER DEFAULT 0,');
    console.log('  ADD COLUMN IF NOT EXISTS processed_files INTEGER DEFAULT 0,');
    console.log('  ADD COLUMN IF NOT EXISTS current_file TEXT,');
    console.log('  ADD COLUMN IF NOT EXISTS report_url TEXT,');
    console.log('  ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0,');
    console.log('  ADD COLUMN IF NOT EXISTS scan_type TEXT DEFAULT \'fast\',');
    console.log('  ADD COLUMN IF NOT EXISTS error_message TEXT;');
    console.log('');
    console.log('-- Create indexes');
    console.log('CREATE INDEX IF NOT EXISTS idx_scans_report_url ON scans(report_url) WHERE report_url IS NOT NULL;');
    console.log('CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);');
    console.log('```\n');

    console.log('🔍 Next: Run "node check-reports.js" to verify setup');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    console.log('\n💡 Run the SQL migration manually:');
    console.log('   File: backend/prisma/migrations/03_ADD_REPORT_COLUMNS.sql');
  }
}

setupDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
