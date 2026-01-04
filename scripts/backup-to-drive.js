/**
 * Backup to Google Drive Script
 * 
 * Uploads backups to Google Drive and manages retention (last 30 days)
 * 
 * SETUP REQUIRED:
 * 1. Install Google APIs: npm install googleapis
 * 2. Create Google Cloud Project
 * 3. Enable Google Drive API
 * 4. Create Service Account
 * 5. Download credentials JSON
 * 6. Share Google Drive folder with service account email
 * 7. Set GOOGLE_DRIVE_FOLDER_ID in .env.local
 * 8. Set GOOGLE_SERVICE_ACCOUNT_KEY (path to credentials JSON) in .env.local
 * 
 * Run with: npm run backup:drive
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const googleDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

console.log('📤 Google Drive Backup Script');
console.log('⚠️  This feature requires setup. See comments in this file for instructions.\n');

if (!googleDriveFolderId || !serviceAccountKeyPath) {
  console.error('❌ Missing Google Drive configuration:');
  console.error('   Required: GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_KEY');
  console.error('\n📖 Setup instructions:');
  console.error('   1. Create Google Cloud Project');
  console.error('   2. Enable Google Drive API');
  console.error('   3. Create Service Account');
  console.error('   4. Download credentials JSON');
  console.error('   5. Share Drive folder with service account email');
  console.error('   6. Set environment variables in .env.local');
  console.error('\n💡 For now, backups are saved locally in /backups folder');
  process.exit(1);
}

// Check if googleapis is installed
try {
  require.resolve('googleapis');
} catch (e) {
  console.error('❌ googleapis package not installed');
  console.error('   Run: npm install googleapis');
  process.exit(1);
}

const { google } = require('googleapis');

/**
 * Upload backup to Google Drive
 */
async function uploadToDrive() {
  console.log('🚀 Starting Google Drive upload...\n');

  // Load service account credentials
  const credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf8'));

  // Authenticate
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  // Find latest backup
  const backupsDir = path.join(process.cwd(), 'backups');
  const backups = fs.readdirSync(backupsDir)
    .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.error('❌ No backups found. Run "npm run backup" first.');
    process.exit(1);
  }

  const latestBackup = backups[0];
  const backupPath = path.join(backupsDir, latestBackup);

  console.log(`📦 Uploading ${latestBackup}...`);

  // Upload file
  const fileMetadata = {
    name: latestBackup,
    parents: [googleDriveFolderId],
  };

  const media = {
    mimeType: 'application/json',
    body: fs.createReadStream(backupPath),
  };

  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, size',
    });

    console.log(`✅ Uploaded: ${file.data.name} (${file.data.size} bytes)`);
    console.log(`🔗 File ID: ${file.data.id}`);

    // Clean up old backups (keep last 30 days)
    await cleanupOldBackups(drive);

    console.log('\n✨ Google Drive backup completed!');
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

/**
 * Delete backups older than 30 days from Google Drive
 */
async function cleanupOldBackups(drive) {
  console.log('\n🧹 Cleaning up old backups (keeping last 30 days)...');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // List all backup files in folder
    const response = await drive.files.list({
      q: `'${googleDriveFolderId}' in parents and name contains 'backup_' and name endsWith '.json'`,
      fields: 'files(id, name, createdTime)',
    });

    const files = response.data.files || [];
    let deletedCount = 0;

    for (const file of files) {
      const fileDate = new Date(file.createdTime);
      if (fileDate < thirtyDaysAgo) {
        await drive.files.delete({ fileId: file.id });
        console.log(`  🗑️  Deleted: ${file.name}`);
        deletedCount++;
      }
    }

    if (deletedCount === 0) {
      console.log('  ✅ No old backups to delete');
    } else {
      console.log(`  ✅ Deleted ${deletedCount} old backup(s)`);
    }
  } catch (error) {
    console.error('  ⚠️  Error cleaning up old backups:', error.message);
  }
}

// Run upload
uploadToDrive()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Google Drive backup failed:', error);
    process.exit(1);
  });

