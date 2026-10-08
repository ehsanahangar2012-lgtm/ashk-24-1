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

// 2. Target directories to scan for old/outdated archives
const targetDirs = [
  rootDir,
  path.join(rootDir, 'public'),
  path.join(rootDir, 'public', 'downloads'),
  path.join(rootDir, 'cpanel-backend', 'uploads'),
  path.join(rootDir, 'uploads')
];

let purgedCount = 0;

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      if (file === '.gitkeep' || file === '.htaccess' || file === 'index.html' || file === 'package.json') return;

      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) return;

        const isArchive = file.endsWith('.zip') || file.endsWith('.apk') || file.endsWith('.tar.gz');

        // Purge if zero bytes or APK/Android project files
        if ((isArchive && stat.size === 0) || file.endsWith('.apk') || file.includes('Android_Project') || file.includes('OTP_Companion')) {
          fs.unlinkSync(fullPath);
          console.log(`  🗑️ Removed obsolete file in ${path.relative(rootDir, dir)}: ${file}`);
          purgedCount++;
          return;
        }

        // Purge outdated start_agent script files
        if ((file.startsWith('start_agent_v') || file.includes('start_agent_v')) && !file.includes(`v${currentVersion}`)) {
          fs.unlinkSync(fullPath);
          console.log(`  🗑️ Purged old version script in ${path.relative(rootDir, dir)}: ${file}`);
          purgedCount++;
          return;
        }

        // Purge any zip archive that does not match current version
        if (isArchive) {
          const isCurrentVersionZip = file.includes(`v${currentVersion}`) || file.includes('latest');
          if (!isCurrentVersionZip) {
            fs.unlinkSync(fullPath);
            console.log(`  🗑️ Purged old version archive in ${path.relative(rootDir, dir)}: ${file}`);
            purgedCount++;
          }
        }
      } catch (e) {}
    });
  }
});

console.log(`✨ [Purge Engine] Cleanup complete! Purged ${purgedCount} old files and prepared fresh build space for v${currentVersion}.`);


