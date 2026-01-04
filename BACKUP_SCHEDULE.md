# Backup Schedule Reminder

## 📅 Weekly Backup Reminder

**Remember to run database backups weekly!**

### Quick Backup Command
```bash
npm run backup
```

This will:
- ✅ Export all tables to JSON
- ✅ Save to `/backups` folder
- ✅ Create timestamped file: `backup_YYYYMMDD.json`

### Backup Checklist

- [ ] Run `npm run backup` every Monday
- [ ] Verify backup file was created in `/backups` folder
- [ ] Check backup file size (should be > 0 KB)
- [ ] Test restore on staging/dev environment monthly
- [ ] Keep at least 4 weekly backups (1 month retention)

### Automated Backup (Future)

Once Google Drive integration is set up:
```bash
npm run backup:drive
```

This will:
- ✅ Upload backup to Google Drive
- ✅ Keep last 30 days automatically
- ✅ Delete older backups

### Manual Backup Schedule

**Recommended Schedule:**
- **Weekly**: Every Monday morning
- **Before Major Updates**: Before deploying significant changes
- **Before Migrations**: Before running database migrations
- **Monthly**: Full backup + test restore

### Setting Up Automated Backups

#### Option 1: Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Weekly (Monday, 2 AM)
4. Action: Start a program
5. Program: `npm`
6. Arguments: `run backup`
7. Start in: `C:\Users\petes\forge44`

#### Option 2: Mac/Linux Cron
```bash
# Edit crontab
crontab -e

# Add weekly backup (Mondays at 2 AM)
0 2 * * 1 cd /path/to/forge44 && npm run backup >> /var/log/forge44-backup.log 2>&1
```

#### Option 3: GitHub Actions (Recommended)
Create `.github/workflows/backup.yml`:
```yaml
name: Weekly Backup

on:
  schedule:
    - cron: '0 2 * * 1' # Every Monday at 2 AM UTC
  workflow_dispatch: # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run backup
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
      - uses: actions/upload-artifact@v3
        with:
          name: backup
          path: backups/*.json
```

### Backup File Naming

Backups are named: `backup_YYYYMMDD.json`

Example:
- `backup_20240115.json` - January 15, 2024
- `backup_20240122.json` - January 22, 2024

### Backup Storage

**Local Backups:**
- Location: `/backups` folder
- Retention: Manual (recommend keeping 4-8 weeks)

**Google Drive Backups (Future):**
- Location: Google Drive folder (set in `.env.local`)
- Retention: Automatic (30 days)
- Cleanup: Old backups deleted automatically

### Verification

After each backup, verify:
1. ✅ File exists in `/backups` folder
2. ✅ File size > 0 KB
3. ✅ File is valid JSON (can open and read)
4. ✅ All tables included in backup
5. ✅ Record counts match expectations

### Emergency Restore

If you need to restore:
1. See `RESTORE.md` for detailed instructions
2. Quick restore: `npm run restore backup_YYYYMMDD.json`
3. Always test restore on dev/staging first!

---

**Last Backup:** _[Update this date after each backup]_
**Next Backup Due:** _[Update this date]_

