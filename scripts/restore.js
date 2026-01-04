/**
 * Database Restore Script
 * 
 * Restores database from a backup JSON file
 * Usage: node scripts/restore.js backup_YYYYMMDD.json
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const backupFile = process.argv[2];

if (!backupFile) {
  console.error('❌ Error: No backup file specified');
  console.error('Usage: node scripts/restore.js backup_YYYYMMDD.json');
  process.exit(1);
}

const backupPath = path.join(process.cwd(), 'backups', backupFile);

if (!fs.existsSync(backupPath)) {
  console.error(`❌ Error: Backup file not found: ${backupPath}`);
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Table restore order (respects foreign key dependencies)
const RESTORE_ORDER = [
  'user_profiles',
  'projects',
  'costs',
  'feedback',
  'monitoring_events',
  'community_templates',
  'generations_count',
];

/**
 * Ask for user confirmation
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Restore a single table
 */
async function restoreTable(tableName, data) {
  if (!data || data.length === 0) {
    console.log(`  ⚠️  No data to restore for ${tableName}`);
    return { success: true, count: 0 };
  }

  try {
    // Clear existing data
    console.log(`  🗑️  Clearing existing ${tableName} data...`);
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (deleteError && deleteError.code !== 'PGRST116') {
      // PGRST116 = no rows to delete, which is fine
      console.warn(`  ⚠️  Warning clearing ${tableName}:`, deleteError.message);
    }

    // Insert data in batches
    const batchSize = 100;
    let restoredCount = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from(tableName)
        .insert(batch);

      if (insertError) {
        throw insertError;
      }

      restoredCount += batch.length;
      process.stdout.write(`\r  ✅ Restored ${restoredCount}/${data.length} records`);
    }

    console.log(''); // New line after progress
    return { success: true, count: restoredCount };
  } catch (error) {
    console.error(`\n  ❌ Error restoring ${tableName}:`, error.message);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Main restore function
 */
async function runRestore() {
  console.log('🔄 Database Restore Script\n');

  // Load backup file
  console.log(`📂 Loading backup: ${backupFile}`);
  let backup;
  try {
    backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  } catch (error) {
    console.error('❌ Error reading backup file:', error.message);
    process.exit(1);
  }

  // Display backup info
  console.log(`📅 Backup date: ${backup.metadata?.date || 'Unknown'}`);
  console.log(`🕐 Backup timestamp: ${backup.metadata?.timestamp || 'Unknown'}`);
  console.log(`📊 Tables in backup: ${backup.metadata?.tables?.length || 0}\n`);

  // Show what will be restored
  console.log('📋 Tables to restore:');
  RESTORE_ORDER.forEach((table) => {
    const tableData = backup.tables?.[table];
    if (tableData) {
      const count = tableData.count || 0;
      const hasError = !!tableData.error;
      const status = hasError ? '⚠️' : '✅';
      console.log(`  ${status} ${table}: ${count} records`);
    }
  });

  // Confirmation
  console.log('\n⚠️  WARNING: This will DELETE all existing data and restore from backup!');
  const confirmed = await askQuestion('Are you sure you want to continue? (yes/no): ');

  if (!confirmed) {
    console.log('❌ Restore cancelled.');
    process.exit(0);
  }

  console.log('\n🚀 Starting restore...\n');

  const results = {};

  // Restore tables in order
  for (const tableName of RESTORE_ORDER) {
    const tableData = backup.tables?.[tableName];

    if (!tableData) {
      console.log(`⏭️  Skipping ${tableName} (not in backup)`);
      continue;
    }

    if (tableData.error) {
      console.log(`⚠️  Skipping ${tableName} (had error during backup: ${tableData.error})`);
      results[tableName] = { success: false, error: tableData.error };
      continue;
    }

    console.log(`📦 Restoring ${tableName}...`);
    const result = await restoreTable(tableName, tableData.data);
    results[tableName] = result;
  }

  // Summary
  console.log('\n✨ Restore completed!\n');
  console.log('📊 Summary:');
  Object.entries(results).forEach(([table, result]) => {
    if (result.success) {
      console.log(`  ✅ ${table}: ${result.count} records restored`);
    } else {
      console.log(`  ❌ ${table}: Failed (${result.error || 'Unknown error'})`);
    }
  });

  const successCount = Object.values(results).filter((r) => r.success).length;
  const totalCount = Object.keys(results).length;

  console.log(`\n📈 Successfully restored ${successCount}/${totalCount} tables`);
}

// Run restore
runRestore()
  .then(() => {
    console.log('\n✨ Restore process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Restore failed:', error);
    process.exit(1);
  });

