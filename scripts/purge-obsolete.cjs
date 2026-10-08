const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const currentVersion = pkg.version || '5.8.19';

console.log(`🧹 [Purge Engine] Purging all old builds, obsolete files and outdated archives (Active Version: v${currentVersion})...`);

// 1. Purge dist directory completely to ensure clean rebuild
const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  try {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log(`  🗑️ Removed previous dist directory: ${path.relative(rootDir, distDir)}`);
  } catch (err) {
    console.warn(`  ⚠️ Could not remove dist directory: ${err.message}`);
  }
}

// 2. Strict purge of ANY zip archives or build files in the workspace root
fs.readdirSync(rootDir).forEach(file => {
  if (file.endsWith('.zip') || file.endsWith('.tar.gz') || file.endsWith('.apk')) {
    try {
      fs.unlinkSync(path.join(rootDir, file));
      console.log(`  🗑️ Purged root build archive: ${file}`);
    } catch (e) {}
  }
});

// 3. Target directories to scan for old/outdated archives
const targetDirs = [
  path.join(rootDir, 'public', 'downloads'),
  path.join(rootDir, 'cpanel-backend', 'uploads'),
  path.join(rootDir, 'uploads')
];

let purgedCount = 0;

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      if (file === '.gitkeep' || file === '.htaccess' || file === 'Ashk24_MacroDroid_Relay.json') return;

      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) return;

        const isArchive = file.endsWith('.zip') || file.endsWith('.apk') || file.endsWith('.tar.gz');
        const isScript = file.endsWith('.bat') || file.endsWith('.sh');

        // Purge if zero bytes or Android temporary files
        if ((isArchive && stat.size === 0) || file.endsWith('.apk') || file.includes('Android_Project') || file.includes('OTP_Companion')) {
          fs.unlinkSync(fullPath);
          console.log(`  🗑️ Removed obsolete file in ${path.relative(rootDir, dir)}: ${file}`);
          purgedCount++;
          return;
        }

        // Purge any script that is not the exact active version
        if (isScript) {
          if (!file.includes(`v${currentVersion}`)) {
            fs.unlinkSync(fullPath);
            console.log(`  🗑️ Purged old/unversioned script in ${path.relative(rootDir, dir)}: ${file}`);
            purgedCount++;
            return;
          }
        }

        // Purge any zip archive that is not the exact active version
        if (isArchive) {
          if (!file.includes(`v${currentVersion}`)) {
            fs.unlinkSync(fullPath);
            console.log(`  🗑️ Purged old/unversioned archive in ${path.relative(rootDir, dir)}: ${file}`);
            purgedCount++;
            return;
          }
        }
      } catch (e) {}
    });
  }
});

console.log(`✨ [Purge Engine] Cleanup complete! Purged all previous builds and prepared fresh build space for v${currentVersion}.`);


