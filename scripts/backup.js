/**
 * Database Backup Script
 * 
 * Exports all Supabase tables to JSON files
 * Run with: npm run backup
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// List of all tables to backup
const TABLES = [
  'projects',
  'user_profiles',
  'community_templates',
  'costs',
  'monitoring_events',
  'feedback',
  'generations_count',
];

// Ensure backups directory exists
const backupsDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
  console.log('📁 Created backups directory');
}

/**
 * Backup a single table
 */
async function backupTable(tableName) {
  try {
    console.log(`📦 Backing up ${tableName}...`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return {
      table: tableName,
      count: data?.length || 0,
      data: data || [],
      backedUpAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error backing up ${tableName}:`, error.message);
    return {
      table: tableName,
      count: 0,
      data: [],
      error: error.message,
      backedUpAt: new Date().toISOString(),
    };
  }
}

/**
 * Main backup function
 */
async function runBackup() {
  console.log('🚀 Starting database backup...\n');

  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = `backup_${timestamp}.json`;
  const filepath = path.join(backupsDir, filename);

  const backup = {
    metadata: {
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      version: '1.0',
      tables: TABLES,
    },
    tables: {},
  };

  // Backup each table
  for (const table of TABLES) {
    const tableBackup = await backupTable(table);
    backup.tables[table] = tableBackup;
  }

  // Write backup file
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8');

  // Summary
  console.log('\n✅ Backup completed!\n');
  console.log('📊 Summary:');
  TABLES.forEach((table) => {
    const tableBackup = backup.tables[table];
    const status = tableBackup.error ? '❌' : '✅';
    console.log(`  ${status} ${table}: ${tableBackup.count} records`);
  });

  console.log(`\n💾 Backup saved to: ${filepath}`);
  console.log(`📁 File size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);

  // List recent backups
  const backups = fs.readdirSync(backupsDir)
    .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 5);

  if (backups.length > 0) {
    console.log('\n📋 Recent backups:');
    backups.forEach((backup) => {
      const filepath = path.join(backupsDir, backup);
      const stats = fs.statSync(filepath);
      const size = (stats.size / 1024).toFixed(2);
      console.log(`  - ${backup} (${size} KB)`);
    });
  }

  return filepath;
}

// Run backup
runBackup()
  .then(() => {
    console.log('\n✨ Backup process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backup failed:', error);
    process.exit(1);
  });

