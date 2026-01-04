# Database Restore Guide

This guide explains how to restore your ForgedApps database from a backup file.

## Prerequisites

- Access to Supabase dashboard
- Service role key (found in Supabase Project Settings > API)
- Backup JSON file (from `/backups` folder)

## Restore Methods

### Method 1: Manual Restore via Supabase Dashboard (Recommended for Small Datasets)

1. **Open Supabase Dashboard**
   - Go to your project: https://supabase.com/dashboard
   - Navigate to **Table Editor**

2. **Clear Existing Data** (Optional)
   - For each table, click **Delete** to remove existing rows
   - Or use SQL Editor: `TRUNCATE TABLE table_name CASCADE;`

3. **Restore Each Table**
   - Open your backup file (`backup_YYYYMMDD.json`)
   - For each table in `backup.tables`:
     - Go to Table Editor > Select table
     - Click **Insert** > **Insert row**
     - Copy data from backup JSON
     - Paste and save

### Method 2: SQL Restore (Recommended for Large Datasets)

1. **Create Restore Script**
   ```bash
   node scripts/restore.js backup_YYYYMMDD.json
   ```

2. **Or Use Supabase SQL Editor**
   - Open backup JSON file
   - Extract data for each table
   - Use `INSERT` statements:

   ```sql
   -- Example: Restore projects table
   INSERT INTO projects (id, user_id, name, code, messages, created_at)
   VALUES
     ('uuid-1', 'user-uuid-1', 'Project 1', 'code...', '[]', '2024-01-01'),
     ('uuid-2', 'user-uuid-2', 'Project 2', 'code...', '[]', '2024-01-02');
   ```

### Method 3: Automated Restore Script

Create `scripts/restore.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const backupFile = process.argv[2];

if (!backupFile) {
  console.error('Usage: node scripts/restore.js backup_YYYYMMDD.json');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

async function restore() {
  console.log('🔄 Starting restore...\n');

  for (const [tableName, tableData] of Object.entries(backup.tables)) {
    if (tableData.error) {
      console.log(`⚠️  Skipping ${tableName} (had error during backup)`);
      continue;
    }

    console.log(`📦 Restoring ${tableName} (${tableData.count} records)...`);

    // Clear existing data
    await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert backup data in batches
    const batchSize = 100;
    const data = tableData.data;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).insert(batch);

      if (error) {
        console.error(`❌ Error restoring ${tableName}:`, error.message);
      } else {
        console.log(`  ✅ Restored ${Math.min(i + batchSize, data.length)}/${data.length} records`);
      }
    }
  }

  console.log('\n✨ Restore completed!');
}

restore();
```

Run:
```bash
npm run restore backup_YYYYMMDD.json
```

## Restore Specific Tables

To restore only specific tables, modify the restore script to filter:

```javascript
const tablesToRestore = ['projects', 'user_profiles']; // Only restore these

for (const [tableName, tableData] of Object.entries(backup.tables)) {
  if (!tablesToRestore.includes(tableName)) continue;
  // ... restore logic
}
```

## Important Notes

⚠️ **Before Restoring:**
- **Backup current data** before restoring (in case something goes wrong)
- **Test restore** on a development/staging database first
- **Check backup file** is valid JSON and contains expected data
- **Verify foreign key constraints** (e.g., `user_profiles` before `projects`)

⚠️ **During Restore:**
- Restore tables in dependency order:
  1. `user_profiles` (no dependencies)
  2. `projects` (depends on `user_profiles`)
  3. `costs` (depends on `user_profiles`)
  4. `feedback` (depends on `user_profiles`)
  5. `monitoring_events` (depends on `user_profiles`)
  6. `community_templates` (depends on `user_profiles`)

⚠️ **After Restore:**
- Verify data integrity
- Check row counts match backup
- Test application functionality
- Update any cached data

## Troubleshooting

### Error: Foreign Key Constraint Violation
- **Solution**: Restore tables in correct order (see above)

### Error: Duplicate Key Violation
- **Solution**: Clear existing data before restore: `TRUNCATE TABLE table_name CASCADE;`

### Error: Invalid JSON
- **Solution**: Verify backup file is not corrupted. Re-run backup if needed.

### Error: Missing Environment Variables
- **Solution**: Ensure `.env.local` has:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Backup File Structure

```json
{
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "date": "1/15/2024",
    "version": "1.0",
    "tables": ["projects", "user_profiles", ...]
  },
  "tables": {
    "projects": {
      "table": "projects",
      "count": 42,
      "data": [...],
      "backedUpAt": "2024-01-15T10:30:00.000Z"
    },
    ...
  }
}
```

## Weekly Backup Reminder

📅 **Remember to run backups weekly:**
```bash
npm run backup
```

Consider setting up a cron job or scheduled task:
- **Windows**: Task Scheduler
- **Mac/Linux**: `crontab -e` → `0 0 * * 0 cd /path/to/forge44 && npm run backup`

## Need Help?

- Check backup file integrity: `node -e "console.log(JSON.parse(require('fs').readFileSync('backups/backup_YYYYMMDD.json')))"`
- Verify Supabase connection: Check `.env.local` credentials
- Review Supabase logs: Dashboard > Logs > Postgres Logs

