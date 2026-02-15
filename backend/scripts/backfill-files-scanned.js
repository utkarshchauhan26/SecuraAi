require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function backfill() {
  console.log('🔧 Backfilling files_scanned from file_count where missing or zero...');
  try {
    const { data: rows, error } = await supabase
      .from('scans')
      .select('id, file_count, files_scanned, status')
      .or('files_scanned.is.null,files_scanned.eq.0')
      .limit(500);

    if (error) {
      console.error('❌ Error fetching scans:', error.message || error);
      return;
    }

    if (!rows || rows.length === 0) {
      console.log('✅ No scans require backfill.');
      return;
    }

    console.log(`ℹ️ Found ${rows.length} scans to update (max 500).`);

    for (const r of rows) {
      const newVal = r.file_count || 0;
      try {
        const { error: upErr } = await supabase
          .from('scans')
          .update({ files_scanned: newVal })
          .eq('id', r.id);
        if (upErr) {
          console.warn(`⚠️ Failed to update scan ${r.id}:`, upErr.message || upErr);
        } else {
          console.log(`✅ Updated scan ${r.id} -> files_scanned=${newVal}`);
        }
      } catch (e) {
        console.warn(`❌ Exception updating ${r.id}:`, e.message || e);
      }
    }

    console.log('✅ Backfill complete.');
  } catch (err) {
    console.error('❌ Unexpected error:', err.message || err);
  }
}

backfill();
