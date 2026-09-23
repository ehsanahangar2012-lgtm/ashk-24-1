const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const currentVersion = pkg.version || '4.4.0';

console.log(`🧹 [Purge Engine] Purging obsolete, stale and older version files (Active version: v${currentVersion})...`);

const targetDirs = [
  rootDir,
  path.join(rootDir, 'public'),
  path.join(rootDir, 'public', 'downloads'),
  path.join(rootDir, 'cpanel-backend', 'uploads'),
  path.join(rootDir, 'uploads'),
  path.join(rootDir, 'dist'),
  path.join(rootDir, 'dist', 'downloads'),
  path.join(rootDir, 'dist', 'cpanel-backend', 'uploads'),
  path.join(rootDir, 'dist', 'uploads'),
];

let purgedCount = 0;

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      // Keep .gitkeep and .htaccess and core files
      if (file === '.gitkeep' || file === '.htaccess' || file === 'index.html' || file === 'package.json') return;

      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) return;

        const isArchive = file.endsWith('.zip') || file.endsWith('.apk') || file.endsWith('.tar.gz');
        
        // Purge if zero bytes
        if (isArchive && stat.size === 0) {
          fs.unlinkSync(fullPath);
          console.log(`  🗑️ Removed 0-byte archive in ${path.relative(rootDir, dir)}: ${file}`);
          purgedCount++;
          return;
        }

        // Purge any APK and Android Project files completely
        if (file.endsWith('.apk') || file.includes('Android_Project') || file.includes('OTP_Companion')) {
          fs.unlinkSync(fullPath);
          console.log(`  🗑️ Removed obsolete APK/Android file in ${path.relative(rootDir, dir)}: ${file}`);
          purgedCount++;
          return;
        }

        // Purge if older version
        const isOutdated = isArchive && (
          (file.includes('_v') || file.includes('-v')) &&
          !file.includes(`v${currentVersion}`) &&
          !file.includes('latest') &&
          !file.includes('Ashk24_MacroDroid')
        );

        if (isOutdated) {
          fs.unlinkSync(fullPath);
          console.log(`  🗑️ Removed outdated version artifact in ${path.relative(rootDir, dir)}: ${file}`);
          purgedCount++;
        }
      } catch (e) {}
    });
  }
});

console.log(`✨ [Purge Engine] Complete! Purged ${purgedCount} obsolete files.`);

