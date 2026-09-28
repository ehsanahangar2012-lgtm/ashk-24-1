const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function packageExtension() {
  const rootDir = path.resolve(__dirname, '..');
  const extDir = path.join(rootDir, 'public', 'extension');
  const outDir = path.join(rootDir, 'public', 'downloads');
  const distOutDir = path.join(rootDir, 'dist', 'downloads');

  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const version = pkg.version || '4.7.8';

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Ensure manifest.json version is synced with package.json
  const manifestPath = path.join(extDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = version;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }

  // 2. Build JSZip package
  const zip = new JSZip();
  const files = fs.readdirSync(extDir);

  for (const file of files) {
    const filePath = path.join(extDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const content = fs.readFileSync(filePath);
      zip.file(file, content);
    }
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  // 3. Purge older extension version archives from downloads directories
  const syncDirs = [outDir, distOutDir];
  syncDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        if (file.includes('extension') && file.endsWith('.zip')) {
          if (!file.includes(`v${version}`) && !file.includes('latest') && file !== 'ashk24-session-harvester-extension.zip') {
            try {
              fs.unlinkSync(path.join(dir, file));
              console.log(`  🗑️ Purged old extension archive: ${file}`);
            } catch (e) {}
          }
        }
      });
    } else {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 4. Save versioned & alias files
  syncDirs.forEach(dir => {
    fs.writeFileSync(path.join(dir, `ashk24-extension-v${version}.zip`), zipBuffer);
    fs.writeFileSync(path.join(dir, `ashk24-extension-latest.zip`), zipBuffer);
    fs.writeFileSync(path.join(dir, `ashk24-session-harvester-extension.zip`), zipBuffer);
  });

  console.log(`📦 [Extension Package] Successfully packaged extension v${version} (${(zipBuffer.length / 1024).toFixed(1)} KB)`);
}

packageExtension().catch(console.error);
