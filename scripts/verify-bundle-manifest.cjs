const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

console.log('\n================================================================');
console.log('📊 [Ashk24 Build Manifest & Bundle Diagnostics Validator]');
console.log('================================================================');

if (!fs.existsSync(distDir)) {
  console.error('❌ Error: dist/ directory not found. Please run vite build first.');
  process.exit(1);
}

let totalFiles = 0;
let totalSizeBytes = 0;
let emptyFiles = [];
const fileManifest = [];

function scanDirectory(dir, relativePath = '') {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relItemPath = path.join(relativePath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath, relItemPath);
    } else if (stat.isFile()) {
      totalFiles++;
      totalSizeBytes += stat.size;

      const isIgnoredZeroByte = item === '.gitkeep' || item === '.git';
      const isZeroByte = stat.size === 0 && !isIgnoredZeroByte;

      const fileInfo = {
        path: relItemPath,
        sizeBytes: stat.size,
        sizeKb: (stat.size / 1024).toFixed(2),
        isZeroByte
      };

      fileManifest.push(fileInfo);

      if (isZeroByte) {
        emptyFiles.push(relItemPath);
      }
    }
  }
}

scanDirectory(distDir);

// Sort files by size descending
fileManifest.sort((a, b) => b.sizeBytes - a.sizeBytes);

console.log('\n📦 Bundle Files Manifest:');
console.log('--------------------------------------------------------------------------------');
console.log(String('File Path').padEnd(52) + String('Size (KB)').padStart(14) + '   Status');
console.log('--------------------------------------------------------------------------------');

fileManifest.forEach(f => {
  const displayPath = f.path.length > 50 ? '...' + f.path.slice(-47) : f.path;
  const status = f.isZeroByte ? '❌ EMPTY (0 Bytes)' : '✅ OK';
  console.log(displayPath.padEnd(52) + (f.sizeKb + ' KB').padStart(14) + '   ' + status);
});

console.log('--------------------------------------------------------------------------------');
console.log(`📁 Total Assets: ${totalFiles} files`);
console.log(`💾 Total Distribution Size: ${(totalSizeBytes / 1024).toFixed(2)} KB (~${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB)`);

// Check for empty files
if (emptyFiles.length > 0) {
  console.error('\n🚨 FATAL ERROR: Zero-byte compiled file(s) detected in production distribution:');
  emptyFiles.forEach(f => console.error(`  ❌ ${f}`));
  console.error('\nBuild aborted to prevent deploying broken/corrupt assets.');
  process.exit(1);
} else {
  console.log('✨ All compiled files verified: NO zero-byte anomalies detected.');
  console.log('================================================================\n');
}
